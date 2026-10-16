#include "send_telegram.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "config.h"
#include <cstring>
#include <new>

#ifndef TELEGRAM_BOT_TOKEN
#define TELEGRAM_BOT_TOKEN ""
#endif

#ifndef TELEGRAM_CHAT_ID
#define TELEGRAM_CHAT_ID ""
#endif

static unsigned long lastTelegramTime = 0;
static const unsigned long TELEGRAM_COOLDOWN = 30000; // Chống spam: 30 giây gửi 1 lần
static portMUX_TYPE telegramTaskMux = portMUX_INITIALIZER_UNLOCKED;
static bool telegramTaskRunning = false;

struct TelegramAlert
{
    char nodeId[32];
    bool tempValid;
    float temp;
    bool smokeValid;
    int smoke;
    bool rorValid;
    float ror;
};

static void telegramAlertTask(void* parameter)
{
    TelegramAlert* alert = static_cast<TelegramAlert*>(parameter);
    if (TELEGRAM_BOT_TOKEN[0] == '\0' || TELEGRAM_CHAT_ID[0] == '\0') {
        Serial.println("[Telegram] Not configured; alert skipped");
        delete alert;
        portENTER_CRITICAL(&telegramTaskMux);
        telegramTaskRunning = false;
        portEXIT_CRITICAL(&telegramTaskMux);
        vTaskDelete(nullptr);
        return;
    }

    if (millis() - lastTelegramTime < TELEGRAM_COOLDOWN && lastTelegramTime != 0) {
        delete alert;
        portENTER_CRITICAL(&telegramTaskMux);
        telegramTaskRunning = false;
        portEXIT_CRITICAL(&telegramTaskMux);
        vTaskDelete(nullptr);
        return;
    }

    if (WiFi.status() == WL_CONNECTED) {
        WiFiClientSecure client;
        client.setInsecure();
        client.setTimeout(1000);

        HTTPClient https;
        https.setTimeout(1000);
        String url = "https://api.telegram.org/bot" + String(TELEGRAM_BOT_TOKEN) + "/sendMessage";

        if (https.begin(client, url)) {
            https.addHeader("Content-Type", "application/json");

            String message = "🚨 <b>CẢNH BÁO CHÁY!</b>\\n"
                             "📍 Node: " + String(alert->nodeId) + "\\n"
                             "🌡 Nhiệt độ: " +
                             (alert->tempValid
                                  ? String(alert->temp, 2) + " °C"
                                  : String("không có dữ liệu")) +
                             "\\n💨 Khói ADC: " +
                             (alert->smokeValid
                                  ? String(alert->smoke)
                                  : String("không có dữ liệu")) +
                             "\\n📈 RoR: " +
                             (alert->rorValid
                                  ? String(alert->ror, 4) + " °C/s"
                                  : String("không có dữ liệu"));

            String payload = "{\"chat_id\":\"" + String(TELEGRAM_CHAT_ID) + "\","
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

    delete alert;
    portENTER_CRITICAL(&telegramTaskMux);
    telegramTaskRunning = false;
    portEXIT_CRITICAL(&telegramTaskMux);
    vTaskDelete(nullptr);
}

void sendTelegramAlert(
    String nodeId,
    bool tempValid,
    float temp,
    bool smokeValid,
    int smoke,
    bool rorValid,
    float ror
) {
    if (TELEGRAM_BOT_TOKEN[0] == '\0' || TELEGRAM_CHAT_ID[0] == '\0') {
        Serial.println("[Telegram] Not configured; alert skipped");
        return;
    }

    portENTER_CRITICAL(&telegramTaskMux);
    if (telegramTaskRunning) {
        portEXIT_CRITICAL(&telegramTaskMux);
        return;
    }
    telegramTaskRunning = true;
    portEXIT_CRITICAL(&telegramTaskMux);

    TelegramAlert* alert = new (std::nothrow) TelegramAlert{};
    if (alert == nullptr) {
        portENTER_CRITICAL(&telegramTaskMux);
        telegramTaskRunning = false;
        portEXIT_CRITICAL(&telegramTaskMux);
        Serial.println("[Telegram] Could not allocate alert task data");
        return;
    }

    strlcpy(alert->nodeId, nodeId.c_str(), sizeof(alert->nodeId));
    alert->tempValid = tempValid;
    alert->temp = temp;
    alert->smokeValid = smokeValid;
    alert->smoke = smoke;
    alert->rorValid = rorValid;
    alert->ror = ror;

    const BaseType_t taskCreated = xTaskCreatePinnedToCore(
        telegramAlertTask,
        "fireTelegram",
        8192,
        alert,
        1,
        nullptr,
        0
    );
    if (taskCreated != pdPASS) {
        delete alert;
        portENTER_CRITICAL(&telegramTaskMux);
        telegramTaskRunning = false;
        portEXIT_CRITICAL(&telegramTaskMux);
        Serial.println("[Telegram] Could not start alert task");
    }
}