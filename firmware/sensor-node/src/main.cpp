#include <Arduino.h>
#include <ArduinoJson.h>

#include "config.h"
#include "sensors.h"
#include "analytics.h"
#include "rs485_comm.h"
#include "RoR.cpp"

// =========================
// SETUP
// =========================
RateOfRiseDetector rorDetector;

void setup()
{
    Serial.begin(SERIAL_BAUDRATE);

    // =========================
    // INITIALIZE SENSORS
    // =========================
    sensors_init();

    // =========================
    // INITIALIZE BUZZER
    // =========================
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, BUZZER_OFF); // Buzzer Active-Low: HIGH = OFF

    // =========================
    // INITIALIZE RS485
    // =========================
    rs485_init();

    // =========================
    // START MESSAGE
    // =========================
    Serial.println();
    Serial.println("================================");
    Serial.println("       NODE_01 SENSOR TEST");
    Serial.println("       ESP32 + MQ-2 + FLAME");
    Serial.println("       + BUZZER + JSON");
    Serial.println("================================");
}

// =========================
// LOOP
// =========================
void loop()
{
    // =========================
    // 1. READ SENSORS
    // =========================
    SensorData sensorData = sensors_read();

    // =========================
    // 2. RATE OF RISE (RoR) CALCULATION
    // =========================
    float rorRate = 0.0f;
    float smoothT = 0.0f;

    // Phải tính toán RoR TRƯỚC để cập nhật giá trị rorRate vào sensorData
    rorDetector.update(sensorData.tempValue, rorRate, smoothT);
    sensorData.rorRate = rorRate;

    // =========================
    // 3. ANALYZE DATA (4 TRẠNG THÁI)
    // =========================
    AnalyticsData analytics = analyze_data(sensorData);

    // =========================
    // 4. CONTROL BUZZER
    // =========================
    if (analytics.fire)
    {
        digitalWrite(BUZZER_PIN, BUZZER_ON);
    }
    else if (analytics.warning)
    {
        static unsigned long lastToggle = 0;
        static bool buzzerState = false;

        unsigned long now = millis();

        if (now - lastToggle >= 150)
        {
            lastToggle = now;
            buzzerState = !buzzerState;

            digitalWrite(
                BUZZER_PIN,
                buzzerState ? BUZZER_ON : !BUZZER_ON);
        }
    }
    else
    {
        digitalWrite(BUZZER_PIN, BUZZER_OFF);
    }

    // =========================
    // 5. CREATE JSON DOCUMENT
    // =========================
    JsonDocument doc;

    // =========================
    // 6. BASIC INFORMATION
    // =========================
    doc["node_id"] = NODE_ID;
    doc["timestamp"] = 0; // Tạm thời chưa có NTP

    // =========================
    // 7. SENSOR DATA
    // =========================
    JsonObject sensors = doc["sensors"].to<JsonObject>();
    sensors["temp"] = sensorData.tempValue;
    sensors["smoke_adc"] = sensorData.mq2Value;
    sensors["flame"] = sensorData.flameDetected;

    // =========================
    // 8. ANALYTICS
    // =========================
    JsonObject analyticsObject = doc["analytics"].to<JsonObject>();
    analyticsObject["ror"] = rorRate;
    analyticsObject["fri"] = nullptr;

    // =========================
    // 9. ACTUATORS
    // =========================
    JsonObject actuators = doc["actuators"].to<JsonObject>();
    actuators["relay"] = false;
    actuators["buzzer"] = analytics.fire;

    // =========================
    // 10. STATUS & ERROR CODE
    // =========================
    // Bắt buộc dùng getStatusString() để chuyển enum class sang chuỗi cho JSON
    doc["status"] = analytics.getStatusString();

    // Nếu trạng thái là FAULT_OFFLINE, gán mã lỗi tương ứng, ngược lại bằng 0
    doc["error_code"] = (analytics.status == NodeStatus::FAULT_OFFLINE) ? 1 : 0;

    // =========================
    // 11. SEND JSON
    // =========================
    rs485_send_json(doc);

    // =========================
    // LOOP DELAY
    // =========================
    delay(1000);
}