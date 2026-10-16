#ifndef ANALYTICS_H
#define ANALYTICS_H

#include "sensors.h"

// =========================
// ANALYTICS DATA
// =========================

struct AnalyticsData
{
    bool smokeDetected;
    bool flameDetected;
    bool tempDetected;
    bool alarm;
    const char* status;
    int errorCode;
    const char* alertReasons[8];
    size_t alertReasonCount;
    unsigned long fireDetectedAtMs;
};

// =========================
// ANALYTICS FUNCTIONS
// =========================

AnalyticsData analyze_data(
    const SensorData& sensorData,
    bool rorValid,
    float rorCPerSec,
    unsigned long nowMs
);

void control_buzzer(const AnalyticsData& analytics, unsigned long nowMs);

#endif