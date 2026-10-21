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
  received_at: string;
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
  actuators?: {
    relay?: boolean;
    buzzer?: boolean;
  };
  status: string;
  error_code: number;
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
    typeof value.received_at === "string" &&
    Number.isFinite(Date.parse(value.received_at)) &&
    typeof value.status === "string" &&
    typeof value.error_code === "number" &&
    isRecord(sensors) &&
    isNullableNumber(sensors.temp) &&
    typeof sensors.smoke_adc === "number" &&
    Number.isFinite(sensors.smoke_adc) &&
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
  if (lastDataAt !== undefined && now - lastDataAt > liveNodeTimeoutMs) {
    return "offline";
  }
  return getReportedNodeStatus(node);
}

export function getReportedNodeStatus(node: LiveNode): LiveNodeStatus {
  if (node.error_code !== 0 || node.status === "SENSOR_ERROR") return "error";
  if (node.status === "WARNING") return "warning";
  if (node.status === "FIRE") return "fire";
  if (node.status === "NORMAL") return "normal";
  return "error";
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
