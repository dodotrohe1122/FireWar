#include <Arduino.h>
#include "config.h"

// Enum trạng thái cảnh báo nhiệt độ
enum HeatAlarmState
{
    HEAT_NORMAL,
    HEAT_WARNING_ROR, // Nhiệt tăng bất thường
    HEAT_ALARM_FIRE   // Xác nhận báo cháy (RoR cao hoặc Nhiệt quá cao)
};

class RateOfRiseDetector
{
private:
    float buffer[WINDOW_SIZE];
    int headIndex;
    int sampleCount;
    unsigned long lastSampleTime;
    float filteredTemp;
    bool isFirstSample;
    float lastRatePerMin = 0.0f;
    HeatAlarmState lastHeatState = HEAT_NORMAL;

public:
    RateOfRiseDetector() : headIndex(0), sampleCount(0), lastSampleTime(0), filteredTemp(0), isFirstSample(true) {}

    // Bộ lọc thông thấp khử nhiễu (alpha = 0.25)
    float lowPassFilter(float raw)
    {
        if (isFirstSample)
        {
            filteredTemp = raw;
            isFirstSample = false;
        }
        else
        {
            filteredTemp = 0.25f * raw + 0.75f * filteredTemp;
        }
        return filteredTemp;
    }

    // Cập nhật và đánh giá nhiệt độ
    HeatAlarmState update(float rawTemp, float &outRatePerMin, float &outSmoothTemp)
    {
        unsigned long currentMillis = millis();

        // Đảm bảo lấy mẫu chính xác theo chu kỳ (không dùng delay)
        if (currentMillis - lastSampleTime < SAMPLE_INTERVAL_MS)
        {
            return HEAT_NORMAL;
        }
        lastSampleTime = currentMillis;

        // 1. Khử nhiễu tín hiệu
        float smoothT = lowPassFilter(rawTemp);
        outSmoothTemp = smoothT;

        // 2. Ghi mẫu vào bộ đệm vòng (Ring Buffer)
        buffer[headIndex] = smoothT;
        headIndex = (headIndex + 1) % WINDOW_SIZE;
        if (sampleCount < WINDOW_SIZE)
        {
            sampleCount++;
            outRatePerMin = 0.0f;
            return HEAT_NORMAL; // Chưa đủ mẫu để tính RoR chính xác
        }

        // 3. Tính độ biến thiên trên toàn bộ cửa sổ thời gian
        // Phần tử cũ nhất nằm ngay tại headIndex sau khi tăng vòng tròn
        float oldestTemp = buffer[headIndex];
        float deltaT = smoothT - oldestTemp;
        float deltaTimeSec = (WINDOW_SIZE * SAMPLE_INTERVAL_MS) / 1000.0f;

        // Tốc độ tăng (°C / phút)
        outRatePerMin = (deltaT / deltaTimeSec) * 60.0f;

        // 4. Máy trạng thái phân loại báo cháy
        // Kịch bản 1: Nhiệt độ vượt ngưỡng cố định (Fixed temp)
        if (smoothT >= FIXED_TEMP_FIRE)
        {
            return HEAT_ALARM_FIRE;
        }

        // Kịch bản 2: Tốc độ gia tăng vượt chuẩn PCCC RoR
        if (outRatePerMin >= ROR_THRESHOLD_FIRE)
        {
            return HEAT_ALARM_FIRE;
        }

        // Kịch bản 3: Tốc độ tăng đáng ngờ (nguy cơ)
        if (outRatePerMin >= ROR_THRESHOLD_WARN)
        {
            return HEAT_WARNING_ROR;
        }

        return HEAT_NORMAL;
    }
};