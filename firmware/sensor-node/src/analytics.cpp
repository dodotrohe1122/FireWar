#include <Arduino.h>
#include <cmath>
#include "config.h"
#include "analytics.h"

#ifndef TEMP_WARNING_THRESHOLD
#define TEMP_WARNING_THRESHOLD 40.0f
#endif

#ifndef TEMP_FIRE_THRESHOLD
#define TEMP_FIRE_THRESHOLD 65.0f
#endif

#ifndef ROR_THRESHOLD_WARN
#define ROR_THRESHOLD_WARN 2.0f
#endif

#ifndef ROR_THRESHOLD_FIRE
#define ROR_THRESHOLD_FIRE 5.0f
#endif

AnalyticsData analyze_data(const SensorData &sensorData, bool isTimeout)
{
    AnalyticsData result;

    // 1. Kiểm tra trạng thái Mất kết nối / Lỗi phần cứng (FAULT_OFFLINE)
    // Bao gồm: Timeout, lỗi đọc cảm biến DS18B20 (-127.0f), hoặc dữ liệu không hợp lệ
    if (isTimeout || !sensorData.tempValue || sensorData.tempValue <= -127.0f || !sensorData.mq2Value)
    {
        result.smokeDetected = false;
        result.flameDetected = sensorData.flameDetected;
        result.tempDetected = false;
        result.fire = false;
        result.status = NodeStatus::FAULT_OFFLINE;
        return result;
    }

    // 2. Đánh giá sơ bộ các cảm biến thô
    result.smokeDetected = (sensorData.mq2Value >= MQ2_THRESHOLD);
    result.flameDetected = sensorData.flameDetected;
    result.tempDetected = (sensorData.tempValue >= TEMP_WARNING_THRESHOLD);

    // 3. Kiểm tra điều kiện Báo động khẩn (ALARM)
    // - Có lửa trực tiếp (Flame sensor)
    // - Hoặc nhiệt độ/khói vượt ngưỡng giới hạn tuyệt đối (Nhiệt độ > 65°C, Khói ADC > 850)
    // - Hoặc tốc độ gia tăng nhiệt độ (RoR) vượt ngưỡng cháy
    const bool isAbsoluteLimitExceeded = (sensorData.tempValue >= TEMP_FIRE_THRESHOLD) || (sensorData.mq2Value >= MQ2_THRESHOLD);
    const bool isRoRFire = (sensorData.rorRate >= ROR_THRESHOLD_FIRE);

    if (result.flameDetected || isAbsoluteLimitExceeded || isRoRFire)
    {
        result.fire = true;
        result.warning = false;
        result.status = NodeStatus::FIRE;
        return result;
    }

    // 4. Kiểm tra điều kiện Cảnh báo sớm (WARNING)
    // - Tốc độ tăng nhiệt RoR nằm trong vùng đáng ngờ
    // - Hoặc nhiệt độ/khói chạm ngưỡng cảnh báo sớm
    const bool isRoRWarning = (sensorData.rorRate >= ROR_THRESHOLD_WARN);
    const bool isWarningLimitExceeded = result.tempDetected || result.smokeDetected || isRoRWarning;

    if (isWarningLimitExceeded)
    {
        result.fire = false;
        result.warning = true;
        result.status = NodeStatus::WARNING;
        return result;
    }

    // 5. Mặc định: Trạng thái Bình thường (NORMAL)
    result.fire = false;
    result.status = NodeStatus::NORMAL;

    return result;
}