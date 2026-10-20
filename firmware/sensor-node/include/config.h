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
// SENSOR THRESHOLD
// =========================

#define MQ2_THRESHOLD 1100  

// =========================
// BUZZER CONFIGURATION
// =========================

#define BUZZER_ON  LOW
#define BUZZER_OFF HIGH

// =========================
// FLAME SENSOR
// =========================

#define FLAME_DETECTED_LEVEL LOW

// =========================
// SERIAL
// =========================

// ==========================================
// CẤU HÌNH THÔNG SỐ THUẬT TOÁN RoR
// ==========================================
#define SAMPLE_INTERVAL_MS   1000    // Lấy mẫu mỗi 1 giây (1000ms)
#define WINDOW_SIZE          15      // Cửa sổ trượt 15 giây (15 mẫu)

#define ROR_THRESHOLD_WARN   5.0     // Ngưỡng cảnh báo nhẹ: 5.0 °C/phút
#define ROR_THRESHOLD_FIRE   8.5     // Tiêu chuẩn NFPA: > 8.5 °C/phút là BÁO  CHÁY
#define FIXED_TEMP_FIRE      65.0    // Ngưỡng nhiệt tuyệt đối (Fixed): 65 °C

#define SERIAL_BAUDRATE 115200

#endif