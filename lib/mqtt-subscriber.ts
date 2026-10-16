import mqtt, { type MqttClient } from "mqtt";
import { saveNodeReading } from "@/lib/mongodb";
import { isFireNodeData, type FireNodeData } from "@/models/node-reading";

const globalForMqtt = globalThis as typeof globalThis & {
  fireMqttClient?: MqttClient;
  fireNodeData?: Map<string, FireNodeData>;
};

const nodeData =
  globalForMqtt.fireNodeData ?? new Map<string, FireNodeData>();

globalForMqtt.fireNodeData = nodeData;

export function getNodeData() {
  return Array.from(nodeData.values());
}

export function getMqttClient() {
  if (globalForMqtt.fireMqttClient) {
    return globalForMqtt.fireMqttClient;
  }

  const brokerUrl =
    process.env.MQTT_BROKER_URL ?? "mqtt://192.168.1.6:1883";

  const client = mqtt.connect(brokerUrl, {
    clientId: `FIRE_NEXTJS_${process.pid}`,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  });

  client.on("connect", () => {
    console.log("[MQTT] Connected:", brokerUrl);

    client.subscribe("fire/gateway/GW_01/all", (err) => {
      if (err) {
        console.error("[MQTT] Subscribe error:", err.message);
      } else {
        console.log("[MQTT] Subscribed to all-node topic");
      }
    });
  });

  client.on("message", (topic, message) => {
    try {
      const parsed: unknown = JSON.parse(message.toString());

      if (!isFireNodeData(parsed)) {
        console.error("[MQTT] Invalid node payload");
        return;
      }
      const data = parsed;

      // Lưu dữ liệu mới nhất của từng node
      nodeData.set(data.node_id, data);

      console.log(
        `[MQTT] ${topic} | ${data.node_id} | ${data.status}`
      );

      void saveNodeReading(data, topic).catch((error: unknown) => {
        console.error(
          `[MongoDB] Failed to persist reading from ${data.node_id}:`,
          error,
        );
      });
    } catch (error) {
      console.error("[MQTT] Invalid JSON:", error);
    }
  });

  client.on("error", (error) => {
    console.error("[MQTT] Error:", error.message);
  });

  globalForMqtt.fireMqttClient = client;

  return client;
}