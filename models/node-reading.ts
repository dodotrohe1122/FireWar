import type { Document } from "mongodb";

export interface FireNodeData {
  node_id: string;
  timestamp: number;
  sensors: {
    temp: number | null;
    smoke_adc: number;
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
  status: string;
  error_code: number;
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

export function isFireNodeData(value: unknown): value is FireNodeData {
  if (!isRecord(value)) return false;
  const { sensors, analytics, actuators } = value;

  return (
    typeof value.node_id === "string" &&
    value.node_id.length > 0 &&
    typeof value.timestamp === "number" &&
    Number.isFinite(value.timestamp) &&
    typeof value.status === "string" &&
    typeof value.error_code === "number" &&
    Number.isFinite(value.error_code) &&
    isRecord(sensors) &&
    isNullableNumber(sensors.temp) &&
    typeof sensors.smoke_adc === "number" &&
    Number.isFinite(sensors.smoke_adc) &&
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
