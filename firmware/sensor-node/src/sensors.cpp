#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#include "config.h"
#include "sensors.h"

// =========================
// ONE-WIRE / DS18B20 SETUP
// =========================
static OneWire oneWire(TEMP_PIN);
static DallasTemperature ds18b20(&oneWire);

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

    Serial.println("[SENSORS] Initialized");
}

// =========================
// READ SENSORS
// =========================
SensorData sensors_read()
{
    SensorData data;

    // =========================
    // READ MQ-2
    // =========================
    data.mq2Value = analogRead(MQ2_PIN);

    // =========================
    // READ FLAME SENSOR
    // =========================
    data.flameValue = digitalRead(FLAME_PIN);
    data.flameDetected = (data.flameValue == FLAME_DETECTED_LEVEL);

    // =========================
    // READ DS18B20
    // =========================
    ds18b20.requestTemperatures();
    float temp = ds18b20.getTempCByIndex(0);

    // Xử lý lỗi hở mạch hoặc thiếu trở kéo (trả về -127°C)
    if (temp == DEVICE_DISCONNECTED_C) {
        Serial.println("[WARNING] Khong tim thay DS18B20!");
        data.tempValue = -999.0; // Gán mã lỗi để code bên ngoài dễ nhận biết
    } else {
        data.tempValue = temp;
    }

    return data;
}