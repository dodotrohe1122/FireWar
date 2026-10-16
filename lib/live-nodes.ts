import type {
  GatewaySystemStatus,
  NodeAlarmStatus,
} from "@/models/node-reading";

export type LiveNodeStatus =
  | "normal"
  | "warning"
  | "fire"
  | "error"
  | "offline";

export const liveNodeTimeoutMs = 15_000;

export interface LiveNode {
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
  actuators?: {
    relay?: boolean;
    buzzer?: boolean;
  };
  status: NodeAlarmStatus;
  error_code: number;
  system_status?: GatewaySystemStatus;
  alert_reasons?: string[];
  fire_detected_at_ms?: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

export function isLiveNode(value: unknown): value is LiveNode {
  if (!isRecord(value)) return false;
  const sensors = value.sensors;
  const analytics = value.analytics;

  return (
    typeof value.node_id === "string" &&
    typeof value.timestamp === "number" &&
    Number.isFinite(value.timestamp) &&
    (value.status === "NORMAL" ||
      value.status === "WARNING" ||
      value.status === "FIRE" ||
      value.status === "SENSOR_ERROR") &&
    typeof value.error_code === "number" &&
    (value.system_status === undefined ||
      value.system_status === "NORMAL" ||
      value.system_status === "WARNING" ||
      value.system_status === "FIRE" ||
      value.system_status === "SENSOR_ERROR" ||
      value.system_status === "OFFLINE") &&
    (value.alert_reasons === undefined ||
      (Array.isArray(value.alert_reasons) &&
        value.alert_reasons.every((reason) => typeof reason === "string"))) &&
    (value.fire_detected_at_ms === undefined ||
      isNullableNumber(value.fire_detected_at_ms)) &&
    isRecord(sensors) &&
    isNullableNumber(sensors.temp) &&
    isNullableNumber(sensors.smoke_adc) &&
    typeof sensors.flame === "boolean" &&
    isRecord(analytics) &&
    isNullableNumber(analytics.ror) &&
    isNullableNumber(analytics.fri)
  );
}

export function getLiveNodeStatus(
  node: LiveNode,
  now = Date.now(),
  lastDataAt?: number,
): LiveNodeStatus {
  if (node.status === "FIRE") return "fire";
  if (lastDataAt !== undefined && now - lastDataAt > liveNodeTimeoutMs) {
    return "offline";
  }
  if (node.status === "WARNING") return "warning";
  if (node.error_code !== 0 || node.status === "SENSOR_ERROR") return "error";
  if (node.status === "NORMAL") return "normal";
  return "error";
}

export function getGatewaySystemStatus(
  value: GatewaySystemStatus | undefined,
): LiveNodeStatus {
  switch (value) {
    case "NORMAL":
      return "normal";
    case "WARNING":
      return "warning";
    case "FIRE":
      return "fire";
    case "OFFLINE":
      return "offline";
    case "SENSOR_ERROR":
      return "error";
    default:
      return "error";
  }
}

export function getAlertReasonLabel(reason: string) {
  switch (reason) {
    case "TEMP_HIGH":
      return "Nhiệt độ cao";
    case "SMOKE_HIGH":
      return "Khói cao (ADC)";
    case "ROR_HIGH":
      return "Tốc độ tăng nhiệt cao";
    case "FLAME_DETECTED":
      return "Phát hiện tia lửa";
    case "TEMP_SENSOR_ERROR":
      return "Lỗi cảm biến nhiệt độ";
    case "SENSOR_DATA_INVALID":
      return "Dữ liệu cảm biến không hợp lệ";
    case "ROR_NOT_READY":
      return "Đang thu thập mẫu để tính tốc độ tăng nhiệt";
    default:
      return reason;
  }
}

export function getLiveNodeLocation(nodeId: string) {
  const kitchenMatch = nodeId.match(/KITCHEN/i);
  if (kitchenMatch) return "Khu vực bếp";

  const roomMatch = nodeId.match(/ROOM[_-]?(\d+)/i);
  if (roomMatch) return `Phòng ${roomMatch[1]}`;

  return "Chưa cấu hình vị trí";
}

export function getLiveStatusLabel(status: LiveNodeStatus) {
  switch (status) {
    case "normal":
      return "Ổn định";
    case "warning":
      return "Cảnh báo";
    case "fire":
      return "Báo cháy";
    case "error":
      return "Lỗi cảm biến";
    case "offline":
      return "Mất kết nối";
  }
}

export function getLiveStatusClass(status: LiveNodeStatus) {
  switch (status) {
    case "normal":
      return "bg-emerald-50 border-emerald-200 text-emerald-700";
    case "warning":
      return "bg-amber-50 border-amber-200 text-amber-700";
    case "fire":
      return "bg-red-50 border-red-200 text-red-700";
    case "error":
      return "bg-slate-100 border-slate-200 text-slate-600";
    case "offline":
      return "bg-slate-100 border-slate-200 text-slate-500";
  }
}
