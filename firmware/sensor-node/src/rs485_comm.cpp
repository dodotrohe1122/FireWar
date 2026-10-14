
#include <Arduino.h>
#include <ArduinoJson.h>

#include "config.h"
#include "rs485_comm.h"

// ========================================
// UART2 CONFIGURATION
// ========================================

namespace {
    constexpr int UART2_RX_PIN = 16;
    constexpr int UART2_TX_PIN = 17;
    constexpr uint32_t UART2_BAUD = 115200;
}

// ========================================
// INITIALIZE UART2
// ========================================

void rs485_init()
{
    // UART2: RX=GPIO16, TX=GPIO17
    Serial2.begin(
        UART2_BAUD,
        SERIAL_8N1,
        UART2_RX_PIN,
        UART2_TX_PIN
    );

    Serial.println("[UART2] Communication initialized");
    Serial.printf(
        "[UART2] RX=GPIO%d, TX=GPIO%d, baud=%lu\n",
        UART2_RX_PIN,
        UART2_TX_PIN,
        (unsigned long)UART2_BAUD
    );
}

// ========================================
// SEND JSON TO GATEWAY
// ========================================

void rs485_send_json(JsonDocument& doc)
{
    // Gui mot dong JSON, ket thuc bang newline
    serializeJson(doc, Serial2);
    Serial2.println();

    // Chi hien thi log tren USB Serial Monitor
    Serial.print("[UART2 TX] ");
    serializeJson(doc, Serial);
    Serial.println();
}