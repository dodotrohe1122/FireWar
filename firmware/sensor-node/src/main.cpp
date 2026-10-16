#include <Arduino.h>
#include <ArduinoJson.h>
#include <cstring>

#include "config.h"
#include "sensors.h"
#include "analytics.h"
#include "uart_link.h"
#include "rate_of_rise.h"

namespace
{
    RateOfRiseDetector rorDetector;
    SensorData latestSensorData = {};
    AnalyticsData latestAnalytics = {};
    float rorCPerSec = 0.0f;
    float smoothedTemperatureC = 0.0f;
    bool rorValid = false;
    unsigned long nextSampleAt = 0;
}

static void sendSensorSnapshot(unsigned long nowMs)
{
    SensorData evaluatedSensorData = latestSensorData;
    if (evaluatedSensorData.tempValid && smoothedTemperatureC != 0.0f)
    {
        evaluatedSensorData.tempValue = smoothedTemperatureC;
    }
    latestAnalytics = analyze_data(
        evaluatedSensorData,
        rorValid,
        rorCPerSec,
        nowMs
    );
    control_buzzer(latestAnalytics, nowMs);

    JsonDocument doc;
    doc["node_id"] = NODE_ID;
    doc["timestamp"] = nowMs;

    JsonObject sensors = doc["sensors"].to<JsonObject>();
    if (latestSensorData.tempValid)
    {
        sensors["temp"] = smoothedTemperatureC;
    }
    else
    {
        sensors["temp"] = nullptr;
    }
    sensors["smoke_adc"] = latestSensorData.mq2Value;
    sensors["flame"] = latestSensorData.flameDetected;

    JsonObject analytics = doc["analytics"].to<JsonObject>();
    if (rorValid)
    {
        analytics["ror"] = rorCPerSec;
    }
    else
    {
        analytics["ror"] = nullptr;
    }
    analytics["fri"] = nullptr;

    JsonObject actuators = doc["actuators"].to<JsonObject>();
    actuators["relay"] = false;
    actuators["buzzer"] = digitalRead(BUZZER_PIN) == BUZZER_ON;

    JsonArray reasons = doc["alert_reasons"].to<JsonArray>();
    for (size_t i = 0; i < latestAnalytics.alertReasonCount; ++i)
    {
        reasons.add(latestAnalytics.alertReasons[i]);
    }

    doc["status"] = latestAnalytics.status;
    doc["error_code"] = latestAnalytics.errorCode;
    if (latestAnalytics.fireDetectedAtMs != 0)
    {
        doc["fire_detected_at_ms"] = latestAnalytics.fireDetectedAtMs;
    }
    else
    {
        doc["fire_detected_at_ms"] = nullptr;
    }

    uartLinkSendJson(doc);
}

void setup()
{
    Serial.begin(SERIAL_BAUDRATE);
    sensors_init();

    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, BUZZER_OFF);

    uartLinkInit();
    nextSampleAt = millis() + SENSOR_SAMPLE_INTERVAL_MS;

    Serial.println();
    Serial.println("================================");
    Serial.println("   FIREWAR SENSOR NODE READY");
    Serial.println("================================");
}

void loop()
{
    const unsigned long nowMs = millis();
    latestSensorData = sensors_read();

    if (latestSensorData.tempFresh && latestSensorData.tempValid)
    {
        rorValid = rorDetector.update(
            latestSensorData.tempValue,
            nowMs,
            rorCPerSec,
            smoothedTemperatureC
        );
    }

    if (static_cast<int32_t>(nowMs - nextSampleAt) >= 0)
    {
        nextSampleAt = nowMs + SENSOR_SAMPLE_INTERVAL_MS;
        sendSensorSnapshot(nowMs);
    }
    else
    {
        control_buzzer(latestAnalytics, nowMs);
    }
}
