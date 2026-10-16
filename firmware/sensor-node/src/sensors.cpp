#include <Arduino.h>
#include <cmath>
#include <OneWire.h>
#include <DallasTemperature.h>

#include "config.h"
#include "sensors.h"

// =========================
// ONE-WIRE / DS18B20 SETUP
// =========================
static OneWire oneWire(TEMP_PIN);
static DallasTemperature ds18b20(&oneWire);
static bool temperatureConversionPending = false;
static float lastValidTemperature = 0.0f;
static unsigned long lastTemperatureReadAt = 0;

// =========================
// SENSOR INITIALIZATION
// =========================
void sensors_init()
{
    // MQ-2 ADC
    analogReadResolution(12);

    // Flame Sensor
    pinMode(FLAME_PIN, INPUT);

    // DS18B20
    ds18b20.begin();
    ds18b20.setWaitForConversion(false);
    ds18b20.requestTemperatures();
    temperatureConversionPending = true;

    Serial.println("[SENSORS] Initialized");
}

// =========================
// READ SENSORS
// =========================
SensorData sensors_read()
{
    SensorData data = {};

    // =========================
    // READ MQ-2
    // =========================
    data.mq2Value = analogRead(MQ2_PIN);
    data.smokeValid = data.mq2Value >= 0 && data.mq2Value <= 4095;

    // =========================
    // READ FLAME SENSOR
    // =========================
    data.flameValue = digitalRead(FLAME_PIN);
    data.flameDetected = (data.flameValue == FLAME_DETECTED_LEVEL);
    data.flameValid = true;

    // =========================
    // READ DS18B20
    // =========================
    if (temperatureConversionPending && ds18b20.isConversionComplete()) {
        const float temp = ds18b20.getTempCByIndex(0);
        if (isfinite(temp) &&
            temp != DEVICE_DISCONNECTED_C &&
            temp >= -55.0f &&
            temp <= 125.0f)
        {
            lastValidTemperature = temp;
            lastTemperatureReadAt = millis();
            data.tempFresh = true;
        }
        else
        {
            Serial.println("[SENSORS] Invalid or disconnected DS18B20");
            lastTemperatureReadAt = 0;
        }

        ds18b20.requestTemperatures();
        temperatureConversionPending = true;
    }

    const unsigned long nowMs = millis();
    data.tempValid =
        lastTemperatureReadAt != 0 &&
        nowMs - lastTemperatureReadAt <= TEMP_SENSOR_STALE_MS;
    data.tempValue = data.tempValid ? lastValidTemperature : 0.0f;

    return data;
}