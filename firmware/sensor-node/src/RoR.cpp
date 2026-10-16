#include <cmath>
#include "rate_of_rise.h"

bool RateOfRiseDetector::update(
    float temperatureC,
    unsigned long nowMs,
    float& rateCPerSec,
    float& smoothedTemperatureC
)
{
    if (!isfinite(temperatureC) || temperatureC < -55.0f || temperatureC > 125.0f)
    {
        return false;
    }

    if (initialized && nowMs - lastSampleAt < 500UL)
    {
        return false;
    }

    if (initialized && nowMs - lastSampleAt > 5000UL)
    {
        head = 0;
        count = 0;
    }
    lastSampleAt = nowMs;

    if (!initialized)
    {
        filteredTemperature = temperatureC;
        initialized = true;
    }
    else
    {
        filteredTemperature = 0.35f * temperatureC + 0.65f * filteredTemperature;
    }
    smoothedTemperatureC = filteredTemperature;

    size_t writeIndex;
    if (count < WINDOW_SIZE)
    {
        writeIndex = (head + count) % WINDOW_SIZE;
        ++count;
    }
    else
    {
        writeIndex = head;
        head = (head + 1) % WINDOW_SIZE;
    }
    temperatures[writeIndex] = filteredTemperature;
    timestamps[writeIndex] = nowMs;

    if (count < 3)
    {
        return false;
    }

    const unsigned long elapsedMs = nowMs - timestamps[head];
    if (elapsedMs < 1000UL)
    {
        return false;
    }

    rateCPerSec =
        (filteredTemperature - temperatures[head]) /
        (static_cast<float>(elapsedMs) / 1000.0f);
    return isfinite(rateCPerSec);
}
