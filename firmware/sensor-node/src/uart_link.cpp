
#include <Arduino.h>
#include <ArduinoJson.h>

#include "config.h"
#include "uart_link.h"

// ========================================
// INITIALIZE UART2
// ========================================

void uartLinkInit()
{
    // Direct 3.3 V UART connection to the Gateway ESP32.
    Serial2.begin(
        UART_LINK_BAUD,
        SERIAL_8N1,
        UART_LINK_RX_PIN,
        UART_LINK_TX_PIN
    );

    Serial.println("[UART2] Direct ESP32 UART link initialized");
    Serial.printf(
        "[UART2] RX=GPIO%d, TX=GPIO%d, baud=%lu\n",
        UART_LINK_RX_PIN,
        UART_LINK_TX_PIN,
        (unsigned long)UART_LINK_BAUD
    );
}

// ========================================
// SEND JSON TO GATEWAY
// ========================================

void uartLinkSendJson(JsonDocument& doc)
{
    // Send one newline-delimited JSON frame over the direct UART cable.
    serializeJson(doc, Serial2);
    Serial2.println();

    Serial.printf(
        "[UART2] Sent %u bytes\n",
        static_cast<unsigned>(measureJson(doc) + 1)
    );
}