"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlert, Clock3, Flame, ShieldAlert, WifiOff, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveNodes } from "@/hooks/use-live-nodes";
import {
  getLiveNodeLocation,
  getLiveNodeStatus,
  getLiveStatusClass,
  getLiveStatusLabel,
  type LiveNode,
  type LiveNodeStatus,
} from "@/lib/live-nodes";

type AlertStatus = Exclude<LiveNodeStatus, "normal">;
type AlertFilter = "all" | AlertStatus;

const alertStyle: Record<AlertStatus, { icon: typeof Flame }> = {
  fire: { icon: Flame },
  warning: { icon: CircleAlert },
  error: { icon: Activity },
  offline: { icon: WifiOff },
};

const filters: { value: AlertFilter; label: string }[] = [
  { value: "all", label: "Tất cả cảnh báo" },
  { value: "fire", label: "Báo cháy" },
  { value: "warning", label: "Cảnh báo" },
  { value: "error", label: "Lỗi cảm biến" },
  { value: "offline", label: "Ngoại tuyến" },
];

export default function AlertsPage() {
  const { nodes, now, loading, error } = useLiveNodes();
  const [filter, setFilter] = useState<AlertFilter>("all");
  const alerts = nodes
    .map((node) => ({
      node,
      status: getLiveNodeStatus(node, now, Date.parse(node.received_at)),
    }))
    .filter(
      (item): item is { node: LiveNode; status: AlertStatus } =>
        item.status !== "normal",
    );
  const visibleAlerts = alerts.filter(
    ({ status }) => filter === "all" || status === filter,
  );
  const fireCount = alerts.filter(({ status }) => status === "fire").length;
  const warningCount = alerts.filter(({ status }) =>
    status === "warning" || status === "error",
  ).length;
  const offlineCount = alerts.filter(({ status }) => status === "offline").length;

  return (
    <div className="min-h-screen flex-1 bg-[#f8fafc] text-slate-800">
      <div className="mx-auto w-full max-w-[1220px] space-y-6 px-4 py-5 md:px-8 md:py-7">
        <header>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400"><span>Hệ thống</span><span>/</span><span className="text-slate-600">Cảnh báo</span></div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cảnh báo theo node thực tế</h1>
          <p className="mt-1 text-sm text-slate-500">Danh sách suy ra trực tiếp từ trạng thái MQTT mới nhất; không có cảnh báo mẫu hoặc xác nhận giả.</p>
        </header>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="rounded-xl border-red-200 bg-red-50/50 shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm font-medium text-red-700">Báo cháy</p><p className="mt-2 text-3xl font-bold text-red-800">{fireCount}</p></div><Flame className="h-6 w-6 text-red-500" /></CardContent></Card>
          <Card className="rounded-xl border-amber-200 bg-amber-50/50 shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm font-medium text-amber-700">Cảnh báo / lỗi</p><p className="mt-2 text-3xl font-bold text-amber-800">{warningCount}</p></div><CircleAlert className="h-6 w-6 text-amber-500" /></CardContent></Card>
          <Card className="rounded-xl border-slate-200 shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm font-medium text-slate-500">Ngoại tuyến</p><p className="mt-2 text-3xl font-bold text-slate-900">{offlineCount}</p></div><ShieldAlert className="h-6 w-6 text-slate-400" /></CardContent></Card>
        </div>

        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-base font-bold text-slate-900">Trạng thái cần theo dõi</CardTitle><p className="mt-1 text-xs text-slate-500">{visibleAlerts.length} node cần chú ý · cập nhật mỗi 3 giây</p></div><Badge variant="secondary" className="border border-slate-200 bg-slate-50 text-slate-600">{nodes.length} node đã ghi nhận</Badge></div>
            <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">{filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition ${filter === item.value ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{item.label}{item.value !== "all" && <span className="ml-1 opacity-60">{alerts.filter(({ status }) => status === item.value).length}</span>}</button>)}</div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {visibleAlerts.length ? visibleAlerts.map(({ node, status }) => {
              const Icon = alertStyle[status].icon;
              return <article key={node.node_id} className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-start">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getLiveStatusClass(status)}`}><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{node.node_id}</h2><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getLiveStatusClass(status)}`}>{getLiveStatusLabel(status)}</span></div>
                  <p className="mt-2 text-sm text-slate-500">{getLiveNodeLocation(node.node_id)}</p>
                  <p className="mt-2 text-sm text-slate-700">Nhiệt độ: {node.sensors.temp === null ? "—" : `${node.sensors.temp.toFixed(1)} °C`} · Khói: {node.sensors.smoke_adc} ADC · Lửa: {node.sensors.flame ? "phát hiện" : "không phát hiện"}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5" />Nhận dữ liệu {new Date(node.received_at).toLocaleString("vi-VN")}</p>
                  <Link href={`/cam-bien?node=${encodeURIComponent(node.node_id)}`} className="mt-3 inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50">Xem dữ liệu node</Link>
                </div>
              </article>;
            }) : <div className="p-12 text-center"><CircleAlert className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">{loading ? "Đang chờ dữ liệu node" : nodes.length ? "Không có node thuộc trạng thái này" : "Chưa nhận được dữ liệu node thực tế"}</p><p className="mt-1 text-sm text-slate-400">Cảnh báo chỉ xuất hiện sau khi gateway gửi dữ liệu qua MQTT.</p></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
