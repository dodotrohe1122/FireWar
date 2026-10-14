#ifndef send_telegram_H
#define send_telegram_H

#include <Arduino.h>

// Khai báo hàm để gateway.cpp gọi được
void sendTelegramAlert(String nodeId, float temp, int smoke, float ror);

#endif