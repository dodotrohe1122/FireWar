#ifndef CONFIG_H
#define CONFIG_H

// =========================
// NODE CONFIGURATION
// =========================

#define NODE_ID "NODE_KITCHEN_01"

// =========================
// SENSOR PIN CONFIGURATION
// =========================

#define MQ2_PIN     34
#define FLAME_PIN   27
#define TEMP_PIN    4

// =========================
// ACTUATOR PIN CONFIGURATION
// =========================

#define BUZZER_PIN  25

// =========================
// BUZZER CONFIGURATION
// =========================

#define BUZZER_ON  LOW
#define BUZZER_OFF HIGH
#define BUZZER_WARNING_ON_MS  200
#define BUZZER_WARNING_OFF_MS 800

// Direct UART2 connection to the Gateway ESP32 (no RS485/MAX485 transceiver).
#define UART_LINK_RX_PIN 16
#define UART_LINK_TX_PIN 17
#define UART_LINK_BAUD 115200

// =========================
// FLAME SENSOR
// =========================

#define FLAME_DETECTED_LEVEL LOW

// =========================
// SERIAL
// =========================

// Experimental thresholds only. Calibrate for the installed sensors/environment.
#define SENSOR_SAMPLE_INTERVAL_MS 1000
#define TEMP_WARNING_C 40.0f
#define TEMP_FIRE_C 60.0f
#define TEMP_WARNING_CLEAR_C 38.0f
#define SMOKE_WARNING_ADC 350
#define SMOKE_FIRE_ADC 700
#define SMOKE_CLEAR_ADC 300
#define ROR_WARNING_C_PER_SEC 0.08f
#define ROR_FIRE_C_PER_SEC 0.15f
#define ROR_CLEAR_C_PER_SEC 0.05f
#define WARNING_CONFIRM_MS 2000UL
#define WARNING_CLEAR_MS 5000UL
#define FIRE_MIN_HOLD_MS 10000UL
#define FIRE_SAFE_CONFIRM_MS 10000UL
#define TEMP_SENSOR_STALE_MS 2500UL

#define SERIAL_BAUDRATE 115200

#endif