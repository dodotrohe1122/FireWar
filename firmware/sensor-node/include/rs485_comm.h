
#pragma once

#include <ArduinoJson.h>

void rs485_init();
void rs485_send_json(JsonDocument& doc);