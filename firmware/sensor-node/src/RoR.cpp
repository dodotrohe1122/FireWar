#include <Arduino.h>
#include "config.h"

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

public:
    RateOfRiseDetector() 
        : headIndex(0), sampleCount(0), lastSampleTime(0), filteredTemp(0.0f), isFirstSample(true) {}

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

    // Cập nhật và tính toán toán học, trả về true khi đã đủ dữ liệu cửa sổ mẫu
    bool update(float rawTemp, float &outRatePerMin, float &outSmoothTemp)
    {
        unsigned long currentMillis = millis();

        // Đảm bảo lấy mẫu chính xác theo chu kỳ (không dùng delay)
        if (currentMillis - lastSampleTime < SAMPLE_INTERVAL_MS)
        {
            outSmoothTemp = filteredTemp;
            return false;
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
            return false; // Chưa đủ mẫu để tính RoR chính xác
        }

        // 3. Tính độ biến thiên trên toàn bộ cửa sổ thời gian
        float oldestTemp = buffer[headIndex];
        float deltaT = smoothT - oldestTemp;
        float deltaTimeSec = (WINDOW_SIZE * SAMPLE_INTERVAL_MS) / 1000.0f;

        // Tốc độ tăng (°C / phút)
        if (deltaTimeSec > 0.0f)
        {
            outRatePerMin = (deltaT / deltaTimeSec) * 60.0f;
        }
        else
        {
            outRatePerMin = 0.0f;
        }

        return true;
    }
};