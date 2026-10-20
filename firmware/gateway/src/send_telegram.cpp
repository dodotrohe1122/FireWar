#include "send_telegram.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>


const char* BOT_TOKEN = "8980177710:AAGKYWq7_rqSKkgAReds450gBkbXojWhwro";
const char* CHAT_ID   = "6124667990";

static unsigned long lastTelegramTime = 0;
static const unsigned long TELEGRAM_COOLDOWN = 30000; 

void sendTelegramAlert(String nodeId, float temp, int smoke, float ror) {
    if (millis() - lastTelegramTime < TELEGRAM_COOLDOWN && lastTelegramTime != 0) {
        return;
    }

    if (WiFi.status() == WL_CONNECTED) {
        WiFiClientSecure client;
        client.setInsecure();

        HTTPClient https;
        String url = "https://api.telegram.org/bot" + String(BOT_TOKEN) + "/sendMessage";

        if (https.begin(client, url)) {
            https.addHeader("Content-Type", "application/json");

            String message = "🚨 <b>CẢNH BÁO CHÁY!</b>\\n"
                             "📍 Node: " + nodeId + "\\n"
                             "🌡 Nhiệt độ: " + String(temp, 2) + " °C\\n"
                             "💨 Khói ADC: " + String(smoke) + "\\n"
                             "📈 RoR: " + String(ror, 4);

            String payload = "{\"chat_id\":\"" + String(CHAT_ID) + "\","
                             "\"text\":\"" + message + "\","
                             "\"parse_mode\":\"HTML\"}";

            int httpResponseCode = https.POST(payload);
            if (httpResponseCode > 0) {
                Serial.printf("[Telegram] Gửi thành công, mã: %d\n", httpResponseCode);
                lastTelegramTime = millis();
            } else {
                Serial.printf("[Telegram] Lỗi gửi: %s\n", https.errorToString(httpResponseCode).c_str());
            }
            https.end();
        }
    }
}