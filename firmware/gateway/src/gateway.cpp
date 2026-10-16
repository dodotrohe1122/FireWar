
#include <Arduino.h>
#include <ArduinoJson.h>
#include <cstring>
#include <cmath>
#include "config.h"
#include "mqtt_client.h"
#include "gateway.h"
#include "send_telegram.h"

// ==================================================
// Direct UART2 link: SENSOR NODE ESP32 -> GATEWAY ESP32
// ==================================================

namespace
{
    constexpr size_t UART_BUFFER_SIZE = 1024;

    constexpr int ERROR_OK = 0;
    constexpr int ERROR_TEMP_INVALID = 1;
    constexpr int ERROR_SMOKE_ADC_INVALID = 2;
    constexpr int ERROR_ANALYTICS_INVALID = 3;
    constexpr unsigned long NODE_TIMEOUT_MS = 15000UL;
    constexpr size_t NODE_COUNT = 1;
    const char* const EXPECTED_NODE_IDS[NODE_COUNT] = {
        "NODE_KITCHEN_01"
    };

    char uartBuffer[UART_BUFFER_SIZE];
    size_t uartIndex = 0;
    bool uartFrameOverflow = false;

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

    bool flame = false;
    bool flame_valid = false;

    float ror = 0.0f;
    bool ror_valid = false;

    float fri = 0.0f;
    bool fri_valid = false;

    bool relay = false;
    bool buzzer = false;

    char status[16] = "UNKNOWN";
    int error_code = 0;
    char alertReasons[8][32] = {};
    size_t alertReasonCount = 0;
    unsigned long lastSeenMs = 0;
    unsigned long fireDetectedAtMs = 0;
    bool hasData = false;
};

namespace
{
    NodeData nodeCache[NODE_COUNT] = {};

    int getExpectedNodeIndex(const char* nodeId)
    {
        for (size_t i = 0; i < NODE_COUNT; ++i)
        {
            if (strcmp(nodeId, EXPECTED_NODE_IDS[i]) == 0)
            {
                return static_cast<int>(i);
            }
        }
        return -1;
    }

    const char* getSystemStatus(unsigned long nowMs)
    {
        bool hasOfflineNode = false;
        bool hasErrorNode = false;
        bool hasWarningNode = false;
        bool hasFireNode = false;

        for (size_t i = 0; i < NODE_COUNT; ++i)
        {
            const NodeData& node = nodeCache[i];
            hasFireNode |= node.hasData && strcmp(node.status, "FIRE") == 0;
            if (!node.hasData || nowMs - node.lastSeenMs >= NODE_TIMEOUT_MS)
            {
                hasOfflineNode = true;
                continue;
            }

            hasWarningNode |= strcmp(node.status, "WARNING") == 0;
            hasErrorNode |= strcmp(node.status, "SENSOR_ERROR") == 0;
        }

        if (hasFireNode) return "FIRE";
        if (hasWarningNode) return "WARNING";
        if (hasErrorNode) return "SENSOR_ERROR";
        if (hasOfflineNode) return "OFFLINE";
        return "NORMAL";
    }

    void normalizeNodeStatus(NodeData& node)
    {
        if (strcmp(node.status, "FIRE") == 0)
        {
            return;
        }

        if (node.error_code != ERROR_OK ||
            !node.temp_valid ||
            !node.smoke_adc_valid ||
            !node.flame_valid ||
            (strcmp(node.status, "NORMAL") != 0 &&
             strcmp(node.status, "WARNING") != 0))
        {
            if (node.error_code == ERROR_OK)
            {
                if (!node.temp_valid)
                {
                    node.error_code = ERROR_TEMP_INVALID;
                }
                else if (!node.smoke_adc_valid || !node.flame_valid)
                {
                    node.error_code = ERROR_SMOKE_ADC_INVALID;
                }
                else
                {
                    node.error_code = ERROR_ANALYTICS_INVALID;
                }
            }
            strlcpy(node.status, "SENSOR_ERROR", sizeof(node.status));
            if (node.alertReasonCount < 8)
            {
                strlcpy(
                    node.alertReasons[node.alertReasonCount++],
                    !node.temp_valid ? "TEMP_SENSOR_ERROR" : "SENSOR_DATA_INVALID",
                    sizeof(node.alertReasons[0])
                );
            }
            return;
        }
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

    if (id == nullptr || getExpectedNodeIndex(id) < 0)
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
        node.temp_valid =
            isfinite(node.temp) && node.temp >= -55.0f && node.temp <= 125.0f;
    }

    // MQ-2 remains raw ADC; null or out-of-range values are sensor errors.
    JsonVariant smoke = sensors["smoke_adc"];
    node.smoke_adc_valid =
        !smoke.isNull() &&
        (smoke.is<int>() || smoke.is<unsigned int>()) &&
        smoke.as<int>() >= 0 &&
        smoke.as<int>() <= 4095;
    if (node.smoke_adc_valid)
    {
        node.smoke_adc = smoke.as<int>();
    }

    // Invalid flame data becomes an explicit node error, never a safe default.
    node.flame_valid = sensors["flame"].is<bool>();
    if (node.flame_valid)
    {
        node.flame = sensors["flame"].as<bool>();
    }

    JsonVariantConst ror = analytics["ror"];
    if (!ror.isNull() && ror.is<float>())
    {
        float val = ror.as<float>();
        if (isfinite(val))
        {
            node.ror = val;
            node.ror_valid = true;
        }
        else
        {
            node.ror = 0.0f;
            node.ror_valid = false;
        }
    }
    else
    {
        node.ror = 0.0f; // Gán mặc định 0.0 khi ror là null
        node.ror_valid = false;
    };

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
    if (doc["error_code"].is<int>())
    {
        node.error_code = doc["error_code"].as<int>();
    }
    if (doc["fire_detected_at_ms"].is<unsigned long>())
    {
        node.fireDetectedAtMs =
            doc["fire_detected_at_ms"].as<unsigned long>();
    }

    node.relay = actuators["relay"] | false;
    node.buzzer = actuators["buzzer"] | false;

    JsonArrayConst reasons = doc["alert_reasons"].as<JsonArrayConst>();
    for (JsonVariantConst reason : reasons)
    {
        if (node.alertReasonCount >= 8 || !reason.is<const char*>()) break;
        strlcpy(
            node.alertReasons[node.alertReasonCount++],
            reason.as<const char*>(),
            sizeof(node.alertReasons[0])
        );
    }

    return true;
}

// ==================================================
// BUILD JSON AND PUBLISH MQTT
// ==================================================

static void publishNodeData(NodeData &node)
{
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

    if (node.smoke_adc_valid)
    {
        sensors["smoke_adc"] = node.smoke_adc;
    }
    else
    {
        sensors["smoke_adc"] = nullptr;
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

    JsonArray reasons = doc["alert_reasons"].to<JsonArray>();
    for (size_t i = 0; i < node.alertReasonCount; ++i)
    {
        reasons.add(node.alertReasons[i]);
    }

    doc["status"] = node.status;
    doc["error_code"] = node.error_code;
    doc["system_status"] = getSystemStatus(millis());
    if (node.fireDetectedAtMs != 0)
    {
        doc["fire_detected_at_ms"] = node.fireDetectedAtMs;
    }
    else
    {
        doc["fire_detected_at_ms"] = nullptr;
    }

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
    Serial2.setRxBufferSize(UART_BUFFER_SIZE);
    Serial2.begin(
        UART_LINK_BAUD,
        SERIAL_8N1,
        UART_LINK_RX_PIN,
        UART_LINK_TX_PIN);

    uartIndex = 0;
    receivedAnyValidMessage = false;

    Serial.println();
    Serial.println("========== CENTRAL GATEWAY ==========");
    Serial.println("[UART2] Waiting for direct Sensor Node ESP32 data");
    Serial.printf("[UART2] RX=%d TX=%d baud=%lu\n",
                  UART_LINK_RX_PIN,
                  UART_LINK_TX_PIN,
                  (unsigned long)UART_LINK_BAUD);
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
            if (uartFrameOverflow)
            {
                Serial.printf(
                    "[UART2] Discarded oversized frame (limit %u bytes)\n",
                    static_cast<unsigned>(UART_BUFFER_SIZE - 1)
                );
            }
            else
            {
                uartBuffer[uartIndex] = '\0';
                if (uartIndex > 0)
                {
                    NodeData node = {};

                    if (parseNodeJson(uartBuffer, node))
                    {
                        Serial.printf(
                            "[UART2] Accepted %s frame (%u bytes), status=%s\n",
                            node.node_id,
                            static_cast<unsigned>(uartIndex),
                            node.status
                        );
                        receivedAnyValidMessage = true;
                        lastValidMessageMs = millis();
                        const int nodeIndex = getExpectedNodeIndex(node.node_id);
                        if (nodeIndex >= 0)
                        {
                            const bool wasFire =
                                nodeCache[nodeIndex].hasData &&
                                strcmp(nodeCache[nodeIndex].status, "FIRE") == 0;
                            node.lastSeenMs = lastValidMessageMs;
                            node.hasData = true;
                            normalizeNodeStatus(node);
                            nodeCache[nodeIndex] = node;
                            if (!wasFire &&
                                strcmp(nodeCache[nodeIndex].status, "FIRE") == 0)
                            {
                                sendTelegramAlert(
                                    String(nodeCache[nodeIndex].node_id),
                                    nodeCache[nodeIndex].temp_valid,
                                    nodeCache[nodeIndex].temp,
                                    nodeCache[nodeIndex].smoke_adc_valid,
                                    nodeCache[nodeIndex].smoke_adc,
                                    nodeCache[nodeIndex].ror_valid,
                                    nodeCache[nodeIndex].ror
                                );
                            }
                            publishNodeData(nodeCache[nodeIndex]);
                        }
                    }
                    else
                    {
                        Serial.printf("[UART2] Invalid frame (%u bytes); message rejected\n",
                                      static_cast<unsigned>(uartIndex));
                    }
                }
            }

            uartIndex = 0;
            uartFrameOverflow = false;
            continue;
        }

        if (!uartFrameOverflow && uartIndex < UART_BUFFER_SIZE - 1)
        {
            uartBuffer[uartIndex++] = c;
        }
        else if (!uartFrameOverflow)
        {
            uartIndex = 0;
            uartFrameOverflow = true;
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