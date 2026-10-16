#ifndef SENSORS_H
#define SENSORS_H

// =========================
// SENSOR DATA STRUCTURE
// =========================

struct SensorData
{
    int mq2Value;
    int flameValue;
    float tempValue;
    bool flameDetected;
    bool tempValid;
    bool tempFresh;
    bool smokeValid;
    bool flameValid;
};

// =========================
// SENSOR FUNCTIONS
// =========================

void sensors_init();

SensorData sensors_read();

#endif