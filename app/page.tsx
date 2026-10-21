"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock3,
  Flame,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  getLiveNodeLocation,
  getLiveNodeStatus,
  getLiveStatusClass,
  getLiveStatusLabel,
  isLiveNode,
  liveNodeTimeoutMs,
  type LiveNode,
  type LiveNodeStatus,
} from "@/lib/live-nodes";

type ConnectionState = "loading" | "connected" | "waiting" | "error";

type TrendPoint = {
  time: string;
  receivedAt: string;
  temperature: number | null;
  fri: number | null;
};

const refreshInterval = 3000;

function getClockTime(date: Date) {
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getConnectionLabel(state: ConnectionState) {
  switch (state) {
    case "loading":
      return "Đang kết nối...";
    case "connected":
      return "Đang nhận dữ liệu";
    case "waiting":
      return "Đang chờ node gửi dữ liệu";
    case "error":
      return "Mất kết nối API";
  }
}

function getStatusDot(status: LiveNodeStatus) {
  switch (status) {
    case "normal":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "fire":
      return "bg-red-500";
    case "error":
      return "bg-slate-500";
    case "offline":
      return "bg-slate-400";
  }
}

function getRoomCardClass(status: LiveNodeStatus) {
  switch (status) {
    case "normal":
      return "border-emerald-200 bg-emerald-50/70";
    case "warning":
      return "border-amber-300 bg-amber-50/70";
    case "fire":
      return "border-red-300 bg-red-50/80";
    case "error":
      return "border-slate-200 bg-slate-100/80";
    case "offline":
      return "border-slate-200 bg-slate-100/80";
  }
}

function getAlertStyle(status: LiveNodeStatus) {
  switch (status) {
    case "fire":
      return {
        badge: "bg-red-100 text-red-700 border-transparent",
        label: "BÁO CHÁY KHẨN CẤP",
      };
    case "warning":
      return {
        badge: "bg-amber-100 text-amber-700 border-transparent",
        label: "CẢNH BÁO NGUY CƠ",
      };
    case "error":
      return {
        badge: "bg-slate-100 text-slate-600 border-transparent",
        label: "LỖI CẢM BIẾN",
      };
    case "offline":
      return {
        badge: "bg-slate-100 text-slate-500 border-transparent",
        label: "NGOẠI TUYẾN",
      };
    case "normal":
      return {
        badge: "bg-emerald-100 text-emerald-700 border-transparent",
        label: "ỔN ĐỊNH",
      };
  }
}

function getFreshSample(nodes: LiveNode[]): TrendPoint {
  const temperatures = nodes
    .map((node) => node.sensors.temp)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const friValues = nodes
    .map((node) => node.analytics.fri)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const latestReceivedAt = nodes.reduce(
    (latest, node) => Math.max(latest, Date.parse(node.received_at)),
    0,
  );
  const receivedAt = new Date(latestReceivedAt);

  return {
    time: getClockTime(receivedAt),
    receivedAt: receivedAt.toISOString(),
    temperature: temperatures.length ? Math.max(...temperatures) : null,
    fri: friValues.length ? Math.max(...friValues) : null,
  };
}

export default function DashboardPage() {
  const [nodes, setNodes] = useState<LiveNode[]>([]);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("loading");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let activeRequest: AbortController | undefined;

    const loadNodes = async () => {
      activeRequest = new AbortController();

      try {
        const response = await fetch("/api/nodes", {
          cache: "no-store",
          signal: activeRequest.signal,
        });
        if (!response.ok) {
          throw new Error(`API trả về lỗi HTTP ${response.status}.`);
        }

        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object") {
          throw new Error("API trả về dữ liệu không hợp lệ.");
        }

        const result = payload as {
          success?: unknown;
          message?: unknown;
          nodes?: unknown;
        };

        if (result.success !== true) {
          throw new Error(
            typeof result.message === "string"
              ? result.message
              : "Không thể lấy dữ liệu node.",
          );
        }
        const liveNodes = result.nodes;
        if (!Array.isArray(liveNodes) || !liveNodes.every(isLiveNode)) {
          throw new Error("Dữ liệu node từ API không đúng định dạng.");
        }

        if (disposed) return;
        const receivedAtMs = Date.now();
        setNow(receivedAtMs);
        setNodes(liveNodes);
        setConnectionState(
          liveNodes.some(
            (node) => receivedAtMs - Date.parse(node.received_at) <= liveNodeTimeoutMs,
          )
            ? "connected"
            : "waiting",
        );
        const latestReadingAt = liveNodes.reduce(
          (latest, node) => Math.max(latest, Date.parse(node.received_at)),
          0,
        );
        setLastUpdated(
          latestReadingAt ? getClockTime(new Date(latestReadingAt)) : null,
        );
        setErrorMessage(null);
        if (liveNodes.length) {
          const sample = getFreshSample(liveNodes);
          setTrendData((current) => {
            if (current.at(-1)?.receivedAt === sample.receivedAt) return current;
            return [...current, sample].slice(-40);
          });
        }
      } catch (error) {
        if (disposed || (error instanceof Error && error.name === "AbortError")) {
          return;
        }

        setConnectionState("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Không thể kết nối đến API cảm biến.",
        );
      } finally {
        if (!disposed) {
          timer = setTimeout(loadNodes, refreshInterval);
        }
      }
    };

    void loadNodes();

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      activeRequest?.abort();
    };
  }, []);

  const statusByNode = nodes.map((node) => ({
    node,
    status: getLiveNodeStatus(
      node,
      now,
      Date.parse(node.received_at),
    ),
  }));
  const normalCount = statusByNode.filter(
    ({ status }) => status === "normal",
  ).length;
  const warningCount = statusByNode.filter(
    ({ status }) => status === "warning" || status === "error",
  ).length;
  const fireCount = statusByNode.filter(
    ({ status }) => status === "fire",
  ).length;
  const activeAlerts = statusByNode
    .filter(({ status }) => status !== "normal")
    .sort((a, b) => {
      const priority: Record<LiveNodeStatus, number> = {
        fire: 0,
        warning: 1,
        error: 2,
        offline: 3,
        normal: 3,
      };
      return priority[a.status] - priority[b.status];
    });
  const hasFriData = trendData.some((point) => point.fri !== null);

  const stats = [
    {
      title: "Tổng node",
      value: nodes.length,
      note: connectionState === "waiting" ? "Chưa có node gửi dữ liệu" : "Node có dữ liệu từ API",
      icon: Boxes,
      iconClass: "bg-slate-100 text-slate-600",
      markerClass: "bg-slate-500",
    },
    {
      title: "Ổn định",
      value: normalCount,
      note: "Trạng thái bình thường",
      icon: CheckCircle2,
      iconClass: "bg-emerald-100/60 text-emerald-600",
      markerClass: "bg-emerald-500",
    },
    {
      title: "Cảnh báo",
      value: warningCount,
      note: `${statusByNode.filter(({ status }) => status === "offline").length} ngoại tuyến · cảnh báo/lỗi`,
      icon: AlertTriangle,
      iconClass: "bg-amber-100/60 text-amber-600",
      markerClass: "bg-amber-500",
    },
    {
      title: "Báo cháy",
      value: fireCount,
      note: "Node báo cháy hoặc phát hiện lửa",
      icon: Flame,
      iconClass: "bg-red-100/60 text-red-600",
      markerClass: "bg-red-500",
    },
  ];

  return (
    <div className="min-h-screen flex-1 space-y-6 bg-[#f8fafc] p-4 text-slate-800 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tổng quan hệ thống
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Giám sát dữ liệu cảm biến trực tiếp qua MQTT.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
              connectionState === "connected"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : connectionState === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-slate-200 bg-white text-slate-600"
            }`}
            role="status"
            aria-live="polite"
          >
            {connectionState === "error" ? (
              <WifiOff className="h-4 w-4" />
            ) : connectionState === "connected" ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4 animate-spin" />
            )}
            {getConnectionLabel(connectionState)}
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Clock3 className="h-4 w-4" />
              Nhận dữ liệu lúc {lastUpdated}
            </div>
          )}
        </div>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{errorMessage}</span>
          <span className="text-xs text-red-600">
            Đang tự thử kết nối lại sau 3 giây.
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="rounded-xl border-slate-200/80 shadow-none"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-slate-900">
                  {stat.value}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <span className={`inline-block h-[2px] w-2.5 ${stat.markerClass}`} />
                  {stat.note}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7 rounded-xl border-slate-200/80 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Trạng thái cảm biến
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Hiển thị trạng thái và số đo mới nhất từ từng node.
              </p>
            </div>
            <Link
              href="/cam-bien/danh-sach"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Danh sách node
            </Link>
          </CardHeader>
          <CardContent className="border-t border-slate-100 pt-4">
            {nodes.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {statusByNode.map(({ node, status }) => (
                  <Link
                    key={node.node_id}
                    href={`/cam-bien?node=${encodeURIComponent(node.node_id)}`}
                    className={`flex min-h-32 flex-col justify-between rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${getRoomCardClass(status)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {getLiveNodeLocation(node.node_id)}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {node.node_id}
                        </p>
                      </div>
                      {status === "fire" ? (
                        <Flame className="h-4 w-4 shrink-0 fill-red-600 text-red-600" />
                      ) : (
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDot(status)}`}
                        />
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
                      <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getLiveStatusClass(status)}`}>
                        {getLiveStatusLabel(status)}
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {node.sensors.temp === null
                          ? "Nhiệt độ —"
                          : `${node.sensors.temp.toFixed(1)} °C`}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span>Khói ADC: {node.sensors.smoke_adc}</span>
                      <span>
                        Lửa: {node.sensors.flame ? "Phát hiện" : "Không"}
                      </span>
                      {node.analytics.ror !== null && (
                        <span>RoR: {node.analytics.ror.toFixed(2)} °C/phút</span>
                      )}
                      {node.analytics.fri !== null && (
                        <span>FRI: {node.analytics.fri.toFixed(0)}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex min-h-52 flex-col items-center justify-center text-center">
                <Activity className="h-8 w-8 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-700">
                  {connectionState === "error"
                    ? "Chưa thể lấy dữ liệu cảm biến"
                    : "Đang chờ dữ liệu từ gateway"}
                </p>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  Kiểm tra gateway đã kết nối MQTT broker và đang publish dữ
                  liệu lên topic của hệ thống.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 rounded-xl border-slate-200/80 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Cảnh báo hiện tại
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Trạng thái suy ra từ lần dữ liệu mới nhất của các node.
              </p>
            </div>
            <Link
              href="/canh-bao"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 border-t border-slate-100 pt-4">
            {activeAlerts.length ? (
              activeAlerts.map(({ node, status }) => {
                const alertStyle = getAlertStyle(status);
                return (
                  <div
                    key={node.node_id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDot(status)}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900">
                          {node.node_id} — {getLiveNodeLocation(node.node_id)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {lastUpdated
                            ? `Cập nhật ${lastUpdated}`
                            : "Đang nhận dữ liệu"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${alertStyle.badge}`}
                    >
                      {alertStyle.label}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <div className="flex min-h-36 flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {nodes.length
                    ? "Không có cảnh báo đang hoạt động"
                    : "Chưa có dữ liệu cảnh báo"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {nodes.length
                    ? "Các node hiện báo trạng thái bình thường."
                    : "Cảnh báo sẽ hiển thị khi node gửi dữ liệu."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="w-full rounded-xl border-slate-200/80 shadow-none">
        <CardHeader className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Xu hướng nhiệt độ và nguy cơ cháy
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Lịch sử được ghi nhận từ lúc mở dashboard, cập nhật mỗi 3 giây.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <span className="inline-block h-[3px] w-3.5 rounded-full bg-blue-600" />
              Nhiệt độ cực đại (°C)
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-[3px] w-3.5 rounded-full bg-amber-500" />
              FRI cực đại
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {trendData.length ? (
            <>
              {!hasFriData && (
                <p className="mb-2 text-xs text-slate-400">
                  Gateway chưa gửi chỉ số FRI; biểu đồ FRI sẽ xuất hiện khi có
                  dữ liệu.
                </p>
              )}
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="#f1f5f9"
                      strokeDasharray="0"
                    />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      minTickGap={24}
                      dy={10}
                    />
                    <YAxis yAxisId="temperature" hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                    <YAxis yAxisId="fri" hide domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      yAxisId="temperature"
                      type="monotone"
                      dataKey="temperature"
                      name="Nhiệt độ cực đại (°C)"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      yAxisId="fri"
                      type="monotone"
                      dataKey="fri"
                      name="FRI cực đại"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={false}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">
              Biểu đồ sẽ bắt đầu khi nhận được số đo nhiệt độ.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
