#ifndef CONFIG_H 
#define CONFIG_H

// Keep deployment credentials in the ignored local secrets.h file.
#if __has_include("secrets.h")
#include "secrets.h"
#endif

#ifndef WIFI_SSID
#define WIFI_SSID "Nguyen Van Nam"
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "Tailadaicabadaobohuc123"
#endif

// ================= MQTT CONFIG ================= // IPv4 của máy tính đang chạy Mosquitto 
#define MQTT_BROKER_IP "192.168.1.6" 
#define MQTT_BROKER_PORT 1883

#define MQTT_CLIENT_ID "ESP32_GATEWAY_01"

// ================= GATEWAY CONFIG ================= 
#define GATEWAY_ID "GW_01"

// Direct UART2 connection to the Sensor Node ESP32 (no RS485/MAX485 module).
#define UART_LINK_RX_PIN 16
#define UART_LINK_TX_PIN 17
#define UART_LINK_BAUD 115200

// MQTT topic for the connected Sensor Node
#define MQTT_TOPIC_ALL "fire/gateway/GW_01/all"

// Chu kỳ gửi dữ liệu: 5000 ms = 5 giây 
#define MQTT_PUBLISH_INTERVAL 5000

#endif