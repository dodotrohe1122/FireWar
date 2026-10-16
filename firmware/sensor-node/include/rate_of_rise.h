#ifndef RATE_OF_RISE_H
#define RATE_OF_RISE_H

#include <Arduino.h>

class RateOfRiseDetector
{
private:
    static constexpr size_t WINDOW_SIZE = 6;
    float temperatures[WINDOW_SIZE] = {};
    unsigned long timestamps[WINDOW_SIZE] = {};
    size_t head = 0;
    size_t count = 0;
    unsigned long lastSampleAt = 0;
    float filteredTemperature = 0.0f;
    bool initialized = false;

public:
    bool update(
        float temperatureC,
        unsigned long nowMs,
        float& rateCPerSec,
        float& smoothedTemperatureC
    );
};

#endif
