
#include <Arduino.h>

#include "mqtt_client.h"
#include "gateway.h"

void setup() {
  Serial.begin(115200);

  Serial.println();
  Serial.println("========== GATEWAY START ==========");

  // Khoi tao UART2 nhan du lieu that
  gatewayInit();

  // Khoi tao MQTT/Wi-Fi hien co
  mqttInit();
}

void loop() {
  // Duy tri ket noi MQTT hien tai
  mqttLoop();

  // Doc du lieu that tu Sensor Node
  gatewayUpdate();

  yield();
}