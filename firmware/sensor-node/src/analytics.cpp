#include <Arduino.h>
#include <cstring>
#include "config.h"
#include "analytics.h"

namespace
{
    enum AlarmState
    {
        STATE_NORMAL,
        STATE_WARNING,
        STATE_FIRE
    };

    constexpr int ERROR_TEMP_INVALID = 1;
    constexpr int ERROR_SMOKE_INVALID = 2;
    constexpr int ERROR_ROR_NOT_READY = 3;

    AlarmState alarmState = STATE_NORMAL;
    unsigned long warningStartedAt = 0;
    unsigned long warningClearedAt = 0;
    unsigned long fireStartedAt = 0;
    unsigned long fireEvidenceClearedAt = 0;
    const char* lastBuzzerStatus = "";
    unsigned long buzzerPhaseStartedAt = 0;

    void addReason(AnalyticsData& result, const char* reason)
    {
        if (result.alertReasonCount < 8)
        {
            result.alertReasons[result.alertReasonCount++] = reason;
        }
    }
}

AnalyticsData analyze_data(
    const SensorData& sensorData,
    bool rorValid,
    float rorCPerSec,
    unsigned long nowMs
)
{
    AnalyticsData result = {};
    result.smokeDetected =
        sensorData.smokeValid && sensorData.mq2Value >= SMOKE_WARNING_ADC;
    result.flameDetected = sensorData.flameValid && sensorData.flameDetected;
    result.tempDetected =
        sensorData.tempValid && sensorData.tempValue >= TEMP_WARNING_C;

    if (!sensorData.tempValid)
    {
        result.errorCode |= ERROR_TEMP_INVALID;
        addReason(result, "TEMP_SENSOR_ERROR");
    }
    if (!sensorData.smokeValid || !sensorData.flameValid)
    {
        result.errorCode |= ERROR_SMOKE_INVALID;
        addReason(result, "SENSOR_DATA_INVALID");
    }
    if (!rorValid)
    {
        result.errorCode |= ERROR_ROR_NOT_READY;
        addReason(result, "ROR_NOT_READY");
    }

    const bool validReadings =
        sensorData.tempValid &&
        sensorData.smokeValid &&
        sensorData.flameValid &&
        rorValid;
    const bool tempWarning =
        sensorData.tempValid && sensorData.tempValue >= TEMP_WARNING_C;
    const bool smokeWarning =
        sensorData.smokeValid && sensorData.mq2Value >= SMOKE_WARNING_ADC;
    const bool rorWarning =
        rorValid && rorCPerSec >= ROR_WARNING_C_PER_SEC;
    const bool tempFire =
        sensorData.tempValid && sensorData.tempValue >= TEMP_FIRE_C;
    const bool smokeFire =
        sensorData.smokeValid && sensorData.mq2Value >= SMOKE_FIRE_ADC;
    const bool rorFire =
        rorValid && rorCPerSec >= ROR_FIRE_C_PER_SEC;
    const bool fireEvidence =
        tempFire ||
        smokeFire ||
        rorFire ||
        (result.flameDetected &&
         (tempWarning || smokeWarning || rorWarning));
    const bool warningEvidence =
        tempWarning || smokeWarning || rorWarning || result.flameDetected;
    const bool warningSafe =
        validReadings &&
        rorValid &&
        !result.flameDetected &&
        sensorData.tempValue <= TEMP_WARNING_CLEAR_C &&
        sensorData.mq2Value <= SMOKE_CLEAR_ADC &&
        rorCPerSec <= ROR_CLEAR_C_PER_SEC;

    if (tempWarning) addReason(result, "TEMP_HIGH");
    if (smokeWarning) addReason(result, "SMOKE_HIGH");
    if (rorWarning) addReason(result, "ROR_HIGH");
    if (result.flameDetected) addReason(result, "FLAME_DETECTED");

    if (fireEvidence)
    {
        if (alarmState != STATE_FIRE)
        {
            fireStartedAt = nowMs;
        }
        alarmState = STATE_FIRE;
        fireEvidenceClearedAt = 0;
    }
    else if (alarmState == STATE_FIRE)
    {
        if (validReadings)
        {
            if (fireEvidenceClearedAt == 0) fireEvidenceClearedAt = nowMs;
            if (nowMs - fireStartedAt >= FIRE_MIN_HOLD_MS &&
                nowMs - fireEvidenceClearedAt >= FIRE_SAFE_CONFIRM_MS)
            {
                alarmState = warningEvidence ? STATE_WARNING : STATE_NORMAL;
                warningStartedAt = 0;
                warningClearedAt = warningEvidence ? 0 : nowMs;
                fireEvidenceClearedAt = 0;
            }
        }
        else
        {
            fireEvidenceClearedAt = 0;
        }
    }
    else if (!validReadings)
    {
        warningStartedAt = 0;
        warningClearedAt = 0;
    }
    else if (alarmState == STATE_WARNING)
    {
        if (!warningSafe)
        {
            warningClearedAt = 0;
        }
        else
        {
            if (warningClearedAt == 0) warningClearedAt = nowMs;
            if (nowMs - warningClearedAt >= WARNING_CLEAR_MS)
            {
                alarmState = STATE_NORMAL;
                warningClearedAt = 0;
            }
        }
    }
    else if (warningEvidence)
    {
        warningClearedAt = 0;
        if (warningStartedAt == 0) warningStartedAt = nowMs;
        if (nowMs - warningStartedAt >= WARNING_CONFIRM_MS)
        {
            alarmState = STATE_WARNING;
        }
    }
    else
    {
        warningStartedAt = 0;
        warningClearedAt = 0;
    }

    if (alarmState == STATE_FIRE)
    {
        result.status = "FIRE";
        result.fireDetectedAtMs = fireStartedAt;
    }
    else if (result.errorCode != 0)
    {
        result.status = "SENSOR_ERROR";
    }
    else if (alarmState == STATE_WARNING)
    {
        result.status = "WARNING";
    }
    else
    {
        result.status = "NORMAL";
    }

    result.alarm =
        strcmp(result.status, "FIRE") == 0 ||
        strcmp(result.status, "WARNING") == 0 ||
        strcmp(result.status, "SENSOR_ERROR") == 0;
    return result;
}

void control_buzzer(const AnalyticsData& analytics, unsigned long nowMs)
{
    if (analytics.status == nullptr)
    {
        digitalWrite(BUZZER_PIN, BUZZER_OFF);
        return;
    }

    if (strcmp(analytics.status, "FIRE") == 0)
    {
        digitalWrite(BUZZER_PIN, BUZZER_ON);
        lastBuzzerStatus = analytics.status;
        return;
    }

    if (strcmp(analytics.status, "WARNING") == 0 ||
        strcmp(analytics.status, "SENSOR_ERROR") == 0)
    {
        if (analytics.status != lastBuzzerStatus)
        {
            lastBuzzerStatus = analytics.status;
            buzzerPhaseStartedAt = nowMs;
            digitalWrite(BUZZER_PIN, BUZZER_ON);
            return;
        }

        const unsigned long phaseDuration =
            (digitalRead(BUZZER_PIN) == BUZZER_ON)
                ? BUZZER_WARNING_ON_MS
                : BUZZER_WARNING_OFF_MS;
        if (nowMs - buzzerPhaseStartedAt >= phaseDuration)
        {
            buzzerPhaseStartedAt = nowMs;
            const bool currentlyOn = digitalRead(BUZZER_PIN) == BUZZER_ON;
            digitalWrite(
                BUZZER_PIN,
                currentlyOn ? BUZZER_OFF : BUZZER_ON
            );
        }
        return;
    }

    digitalWrite(BUZZER_PIN, BUZZER_OFF);
    lastBuzzerStatus = analytics.status;
}
