

#include <Arduino.h>
#include <ArduinoJson.h>
#include <cstring>
#include <cmath>

#include "config.h"
#include "mqtt_client.h"
#include "gateway.h"

// ==================================================
// UART2: SENSOR NODE -> CENTRAL GATEWAY
// ==================================================

namespace
{
    constexpr int UART2_RX_PIN = 16;
    constexpr int UART2_TX_PIN = 17;
    constexpr uint32_t UART2_BAUD = 115200;

    constexpr size_t UART_BUFFER_SIZE = 256;

    constexpr float TEMP_WARNING = 40.0f;
    constexpr float TEMP_FIRE = 60.0f;
    constexpr int SMOKE_WARNING_ADC = 350;
    constexpr int SMOKE_FIRE_ADC = 700;
    constexpr float FRI_WARNING = 35.0f;
    constexpr float FRI_FIRE = 70.0f;

    constexpr int ERROR_OK = 0;
    constexpr int ERROR_TEMP_INVALID = 1;
    constexpr int ERROR_SMOKE_ADC_INVALID = 2;
    constexpr int ERROR_ANALYTICS_INVALID = 3;

    char uartBuffer[UART_BUFFER_SIZE];
    size_t uartIndex = 0;

    unsigned long lastValidMessageMs = 0;
    unsigned long lastTimeoutLogMs = 0;

    bool receivedAnyValidMessage = false;
}

// ==================================================
// DATA STRUCTURE
// ==================================================

struct NodeData
{
    char node_id[32] = {};

    float temp = 0.0f;
    bool temp_valid = false;

    int smoke_adc = 0;
    bool smoke_adc_valid = false;

    float smoke_ppm = 0.0f;
    bool smoke_ppm_valid = false;

    bool flame = false;

    float ror = 0.0f;
    bool ror_valid = false;

    float fri = 0.0f;
    bool fri_valid = false;

    bool relay = false;
    bool buzzer = false;

    char status[16] = "UNKNOWN";
    int error_code = 0;
};



// ==================================================
// DATA PROCESSOR
// ==================================================

static void processNodeData(NodeData &node)
{
    node.error_code = ERROR_OK;

    // Chỉ kiểm tra các trường hiện có dữ liệu.
    if (node.temp_valid &&
        (!isfinite(node.temp) ||
         node.temp < -55.0f || node.temp > 125.0f))
    {
        node.error_code = ERROR_TEMP_INVALID;
    }
    else if (!node.smoke_adc_valid)
    {
        node.error_code = ERROR_SMOKE_ADC_INVALID;
    }
    else if ((node.ror_valid &&
              (!isfinite(node.ror) || node.ror < 0.0f)) ||
             (node.fri_valid &&
              (!isfinite(node.fri) || node.fri < 0.0f)))
    {
        node.error_code = ERROR_ANALYTICS_INVALID;
    }

    if (node.error_code != ERROR_OK)
    {
        strlcpy(node.status, "SENSOR_ERROR", sizeof(node.status));
        return;
    }

    const bool fireDetected =
        node.flame ||
        (node.temp_valid && node.temp >= TEMP_FIRE) ||
        node.smoke_adc >= SMOKE_FIRE_ADC ||
        (node.fri_valid && node.fri >= FRI_FIRE);

    const bool warningDetected =
        (node.temp_valid && node.temp >= TEMP_WARNING) ||
        node.smoke_adc >= SMOKE_WARNING_ADC ||
        (node.fri_valid && node.fri >= FRI_WARNING);

    if (fireDetected)
    {
        strlcpy(node.status, "FIRE", sizeof(node.status));
        node.relay = true;
        node.buzzer = true;
    }
    else if (warningDetected)
    {
        strlcpy(node.status, "WARNING", sizeof(node.status));
        node.relay = false;
        node.buzzer = false;
    }
    else
    {
        strlcpy(node.status, "NORMAL", sizeof(node.status));
        node.relay = false;
        node.buzzer = false;
    }
}

// ==================================================
// PARSE REAL JSON FROM SENSOR NODE
// Expected fields:
// node_id, temp, smoke_adc, smoke_ppm, flame, ror, fri
// ==================================================

static bool parseNodeJson(const char *line, NodeData &node)
{
    JsonDocument doc;

    DeserializationError err = deserializeJson(doc, line);
    if (err)
    {
        Serial.printf("[UART2] Invalid JSON: %s\n", err.c_str());
        return false;
    }

    if (!doc["node_id"].is<const char *>() ||
        !doc["sensors"].is<JsonObject>() ||
        !doc["status"].is<const char *>())
    {
        Serial.println("[UART2] Missing required fields");
        return false;
    }

    const char *id = doc["node_id"].as<const char *>();

    if (id == nullptr ||
        (strcmp(id, "NODE_KITCHEN_01") != 0 &&
         strcmp(id, "NODE_ROOM_02") != 0))
    {
        Serial.println("[UART2] Unknown node_id");
        return false;
    }

    strlcpy(node.node_id, id, sizeof(node.node_id));

    JsonObject sensors = doc["sensors"].as<JsonObject>();
    JsonObject analytics = doc["analytics"].as<JsonObject>();
    JsonObject actuators = doc["actuators"].as<JsonObject>();

    // Temperature: chấp nhận số hoặc null.
    JsonVariant temp = sensors["temp"];
    node.temp_valid = !temp.isNull() &&
                      (temp.is<float>() || temp.is<int>());

    if (node.temp_valid)
    {
        node.temp = temp.as<float>();
    }

    // Smoke ADC là trường cần có và phải là số nguyên.
    JsonVariant smoke = sensors["smoke_adc"];
    if (smoke.isNull() || !smoke.is<int>())
    {
        Serial.println("[UART2] Missing or invalid sensors.smoke_adc");
        return false;
    }

    node.smoke_adc = smoke.as<int>();
    node.smoke_adc_valid =
        node.smoke_adc >= 0 && node.smoke_adc <= 4095;

    if (!node.smoke_adc_valid)
    {
        Serial.println("[UART2] smoke_adc out of range");
        return false;
    }

    // Flame phải là boolean.
    if (!sensors["flame"].is<bool>())
    {
        Serial.println("[UART2] Missing or invalid sensors.flame");
        return false;
    }
    node.flame = sensors["flame"].as<bool>();

    // Smoke PPM: cho phép null.
    JsonVariant ppm = sensors["smoke_ppm"];
    node.smoke_ppm_valid = !ppm.isNull() &&
                           (ppm.is<float>() || ppm.is<int>());

    if (node.smoke_ppm_valid)
    {
        node.smoke_ppm = ppm.as<float>();
        if (!isfinite(node.smoke_ppm) || node.smoke_ppm < 0.0f)
        {
            node.smoke_ppm_valid = false;
        }
    }

    // ROR và FRI: cho phép null khi thuật toán chưa tích hợp.
    JsonVariant ror = analytics["ror"];
    node.ror_valid = !ror.isNull() &&
                     (ror.is<float>() || ror.is<int>());

    if (node.ror_valid)
    {
        node.ror = ror.as<float>();
        if (!isfinite(node.ror) || node.ror < 0.0f)
        {
            node.ror_valid = false;
        }
    }

    JsonVariant fri = analytics["fri"];
    node.fri_valid = !fri.isNull() &&
                     (fri.is<float>() || fri.is<int>());

    if (node.fri_valid)
    {
        node.fri = fri.as<float>();
        if (!isfinite(node.fri) || node.fri < 0.0f)
        {
            node.fri_valid = false;
        }
    }

    // Giữ trạng thái và cơ cấu chấp hành do Sensor Node gửi.
    // Gateway không tự giả định trạng thái cảm biến chưa tích hợp.
    if (doc["status"].is<const char *>())
    {
        strlcpy(node.status, doc["status"], sizeof(node.status));
    }

    node.relay = actuators["relay"] | false;
    node.buzzer = actuators["buzzer"] | false;
    node.error_code = doc["error_code"] | 0;

    return true;
}

// ==================================================
// BUILD JSON AND PUBLISH MQTT
// ==================================================

static void publishNodeData(NodeData &node)
{
    processNodeData(node);

    JsonDocument doc;

    doc["node_id"] = node.node_id;
    doc["timestamp"] = millis();

    JsonObject sensors = doc["sensors"].to<JsonObject>();

    if (node.temp_valid)
    {
        sensors["temp"] = node.temp;
    }
    else
    {
        sensors["temp"] = nullptr;
    }

    sensors["smoke_adc"] = node.smoke_adc;

    if (node.smoke_ppm_valid)
    {
        sensors["smoke_ppm"] = node.smoke_ppm;
    }
    else
    {
        sensors["smoke_ppm"] = nullptr;
    }

    sensors["flame"] = node.flame;

    JsonObject analytics = doc["analytics"].to<JsonObject>();

    if (node.ror_valid)
    {
        analytics["ror"] = node.ror;
    }
    else
    {
        analytics["ror"] = nullptr;
    }

    if (node.fri_valid)
    {
        analytics["fri"] = node.fri;
    }
    else
    {
        analytics["fri"] = nullptr;
    }

    JsonObject actuators = doc["actuators"].to<JsonObject>();
    actuators["relay"] = node.relay;
    actuators["buzzer"] = node.buzzer;

    doc["status"] = node.status;
    doc["error_code"] = node.error_code;

    Serial.println("[OUTPUT] Processed real sensor data:");
    serializeJsonPretty(doc, Serial);
    Serial.println();

    Serial.print("[MQTT] Publishing all-node topic: ");
    Serial.println(MQTT_TOPIC_ALL);

    mqttPublishJson(MQTT_TOPIC_ALL, doc);
}

// ==================================================
// PUBLIC FUNCTIONS
// ==================================================

void gatewayInit()
{
    Serial2.begin(
        UART2_BAUD,
        SERIAL_8N1,
        UART2_RX_PIN,
        UART2_TX_PIN);

    uartIndex = 0;
    receivedAnyValidMessage = false;

    Serial.println();
    Serial.println("========== CENTRAL GATEWAY ==========");
    Serial.println("[UART2] Waiting for real sensor data");
    Serial.printf("[UART2] RX=%d TX=%d baud=%lu\n",
                  UART2_RX_PIN,
                  UART2_TX_PIN,
                  (unsigned long)UART2_BAUD);
}

void gatewayUpdate()
{
    while (Serial2.available() > 0)
    {
        const char c = static_cast<char>(Serial2.read());

        if (c == '\r')
        {
            continue;
        }

        if (c == '\n')
        {
            uartBuffer[uartIndex] = '\0';

            if (uartIndex > 0)
            {
                NodeData node = {};

                Serial.printf("[UART2] RX: %s\n", uartBuffer);

                if (parseNodeJson(uartBuffer, node))
                {
                    receivedAnyValidMessage = true;
                    lastValidMessageMs = millis();
                    publishNodeData(node);
                }
                else
                {
                    Serial.println("[UART2] Message rejected");
                }
            }

            uartIndex = 0;
            continue;
        }

        if (uartIndex < UART_BUFFER_SIZE - 1)
        {
            uartBuffer[uartIndex++] = c;
        }
        else
        {
            uartIndex = 0;
            Serial.println("[UART2] Message too long; discarded");
        }
    }

    // Chi ghi log khi chua nhan duoc ban tin hop le.
    // Khong tao du lieu thay the va khong publish du lieu gia.
    if (!receivedAnyValidMessage &&
        millis() - lastTimeoutLogMs >= 5000)
    {
        lastTimeoutLogMs = millis();
        Serial.println("[UART2] No valid sensor data received yet");
    }

    if (receivedAnyValidMessage &&
        millis() - lastValidMessageMs >= 5000)
    {
        // Chi canh bao tren Serial; khong tu tao ban tin MQTT.
        if (millis() - lastTimeoutLogMs >= 5000)
        {
            lastTimeoutLogMs = millis();
            Serial.println("[UART2] Warning: sensor data timeout");
        }
    }
}