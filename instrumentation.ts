export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getMqttClient } = await import("@/lib/mqtt-subscriber");
    getMqttClient();
  }
}
