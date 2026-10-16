import type { Document } from "mongodb";

export type NodeAlarmStatus =
  | "NORMAL"
  | "WARNING"
  | "FIRE"
  | "SENSOR_ERROR";

export type GatewaySystemStatus = NodeAlarmStatus | "OFFLINE";

export interface FireNodeData {
  node_id: string;
  timestamp: number;
  sensors: {
    temp: number | null;
    smoke_adc: number | null;
    smoke_ppm?: number | null;
    flame: boolean;
  };
  analytics: {
    ror: number | null;
    fri: number | null;
  };
  actuators: {
    relay: boolean;
    buzzer: boolean;
  };
  status: NodeAlarmStatus;
  error_code: number;
  system_status?: GatewaySystemStatus;
  alert_reasons?: string[];
  fire_detected_at_ms?: number | null;
}

export interface NodeReading extends FireNodeData, Document {
  received_at: Date;
  topic: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isNodeAlarmStatus(value: unknown): value is NodeAlarmStatus {
  return (
    value === "NORMAL" ||
    value === "WARNING" ||
    value === "FIRE" ||
    value === "SENSOR_ERROR"
  );
}

function isGatewaySystemStatus(value: unknown): value is GatewaySystemStatus {
  return value === "OFFLINE" || isNodeAlarmStatus(value);
}

export function isFireNodeData(value: unknown): value is FireNodeData {
  if (!isRecord(value)) return false;
  const { sensors, analytics, actuators } = value;

  return (
    typeof value.node_id === "string" &&
    value.node_id.length > 0 &&
    typeof value.timestamp === "number" &&
    Number.isFinite(value.timestamp) &&
    isNodeAlarmStatus(value.status) &&
    typeof value.error_code === "number" &&
    Number.isFinite(value.error_code) &&
    (value.system_status === undefined ||
      isGatewaySystemStatus(value.system_status)) &&
    (value.alert_reasons === undefined ||
      (Array.isArray(value.alert_reasons) &&
        value.alert_reasons.every((reason) => typeof reason === "string"))) &&
    (value.fire_detected_at_ms === undefined ||
      isNullableNumber(value.fire_detected_at_ms)) &&
    isRecord(sensors) &&
    isNullableNumber(sensors.temp) &&
    isNullableNumber(sensors.smoke_adc) &&
    (sensors.smoke_ppm === undefined || isNullableNumber(sensors.smoke_ppm)) &&
    typeof sensors.flame === "boolean" &&
    isRecord(analytics) &&
    isNullableNumber(analytics.ror) &&
    isNullableNumber(analytics.fri) &&
    isRecord(actuators) &&
    typeof actuators.relay === "boolean" &&
    typeof actuators.buzzer === "boolean"
  );
}
