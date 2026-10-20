"use client";

import Link from "next/link";
import { Activity, Building2, CircleAlert, Flame, MapPin, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveNodes } from "@/hooks/use-live-nodes";
import {
  getLiveNodeLocation,
  getLiveNodeStatus,
  getLiveStatusClass,
  getLiveStatusLabel,
} from "@/lib/live-nodes";

export default function BuildingMapPage() {
  const { nodes, now, loading, error } = useLiveNodes();
  const nodeStatuses = nodes.map((node) => ({
    node,
    status: getLiveNodeStatus(node, now, Date.parse(node.received_at)),
    location: getLiveNodeLocation(node.node_id),
  }));
  const groups = new Map<string, typeof nodeStatuses>();
  for (const item of nodeStatuses) {
    const group = groups.get(item.location) ?? [];
    group.push(item);
    groups.set(item.location, group);
  }
  const locations = [...groups.entries()];
  const activeCount = nodeStatuses.filter(({ status }) =>
    status !== "offline" && status !== "error",
  ).length;
  const attentionCount = nodeStatuses.filter(({ status }) =>
    status !== "normal",
  ).length;

  return (
    <div className="min-h-screen flex-1 bg-[#f8fafc] text-slate-800">
      <div className="mx-auto w-full max-w-[1220px] space-y-6 px-4 py-5 md:px-8 md:py-7">
        <header>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400"><span>Tòa nhà</span><span>/</span><span className="text-slate-600">Node thực tế</span></div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tòa nhà & cảm biến</h1>
          <p className="mt-1 text-sm text-slate-500">Chỉ hiển thị node đã gửi dữ liệu. Vị trí được suy ra từ mã node; vị trí chưa xác định sẽ không bị gán tầng/phòng giả.</p>
        </header>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="rounded-xl border-slate-200 shadow-none"><CardContent className="flex items-center gap-4 p-5"><span className="rounded-lg bg-blue-50 p-3 text-blue-600"><Building2 className="h-5 w-5" /></span><div><p className="text-sm text-slate-500">Node đã ghi nhận</p><p className="mt-1 text-2xl font-bold text-slate-900">{nodes.length}</p></div></CardContent></Card>
          <Card className="rounded-xl border-slate-200 shadow-none"><CardContent className="flex items-center gap-4 p-5"><span className="rounded-lg bg-emerald-50 p-3 text-emerald-600"><Thermometer className="h-5 w-5" /></span><div><p className="text-sm text-slate-500">Đang gửi dữ liệu</p><p className="mt-1 text-2xl font-bold text-slate-900">{activeCount}<span className="ml-1 text-sm font-medium text-slate-400">/ {nodes.length}</span></p></div></CardContent></Card>
          <Card className="rounded-xl border-slate-200 shadow-none"><CardContent className="flex items-center gap-4 p-5"><span className="rounded-lg bg-amber-50 p-3 text-amber-600"><CircleAlert className="h-5 w-5" /></span><div><p className="text-sm text-slate-500">Cần chú ý</p><p className="mt-1 text-2xl font-bold text-slate-900">{attentionCount}</p></div></CardContent></Card>
        </div>

        <Card className="rounded-xl border-slate-200 shadow-none">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-bold text-slate-900">Node theo vị trí nhận diện</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Trạng thái được cập nhật từ MQTT mỗi 3 giây.</p>
          </CardHeader>
          <CardContent className="space-y-6 p-5">
            {locations.length ? locations.map(([location, items]) => (
              <section key={location}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><MapPin className="h-4 w-4 text-slate-400" />{location}<span className="text-xs font-normal text-slate-400">{items.length} node</span></h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(({ node, status }) => (
                    <Link key={node.node_id} href={`/cam-bien?node=${encodeURIComponent(node.node_id)}`} className={`flex min-h-36 flex-col justify-between rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${getLiveStatusClass(status)}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div><p className="font-semibold">{node.node_id}</p><p className="mt-1 text-xs opacity-75">Nhận lúc {new Date(node.received_at).toLocaleTimeString("vi-VN")}</p></div>
                        {status === "fire" ? <Flame className="h-5 w-5 fill-red-500 text-red-500" /> : <Activity className="h-5 w-5 opacity-70" />}
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-2">
                        <span className="text-xs font-medium">{getLiveStatusLabel(status)}</span>
                        <span className="text-sm font-bold">{node.sensors.temp === null ? "—" : `${node.sensors.temp.toFixed(1)} °C`}</span>
                      </div>
                      <p className="mt-2 text-xs opacity-75">Khói {node.sensors.smoke_adc} ADC · Lửa {node.sensors.flame ? "phát hiện" : "không phát hiện"}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
                <MapPin className="mb-3 h-8 w-8 text-slate-300" />
                <p className="font-semibold text-slate-700">{loading ? "Đang chờ dữ liệu node" : "Chưa có node thực tế"}</p>
                <p className="mt-1 text-sm text-slate-400">Kết nối gateway và MQTT để node xuất hiện tại đây.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
