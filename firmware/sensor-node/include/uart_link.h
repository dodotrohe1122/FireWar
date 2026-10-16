
#pragma once

#include <ArduinoJson.h>

void uartLinkInit();
void uartLinkSendJson(JsonDocument& doc);