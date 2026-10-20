"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Flame, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLiveNodes } from "@/hooks/use-live-nodes";
import {
  getLiveNodeLocation,
  getLiveNodeStatus,
  getLiveStatusClass,
  getLiveStatusLabel,
  type LiveNodeStatus,
} from "@/lib/live-nodes";

type StatusFilter = "all" | LiveNodeStatus;

export default function SensorListPage() {
  const { nodes, now, loading, error } = useLiveNodes();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const statuses = nodes.map((node) => ({
    node,
    status: getLiveNodeStatus(node, now, Date.parse(node.received_at)),
  }));
  const visibleSensors = statuses.filter(({ node, status: nodeStatus }) => {
    const matchesQuery = `${node.node_id} ${getLiveNodeLocation(node.node_id)}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesQuery && (status === "all" || nodeStatus === status);
  });
  const countByStatus = (currentStatus: StatusFilter) =>
    currentStatus === "all"
      ? nodes.length
      : statuses.filter(({ status: nodeStatus }) => nodeStatus === currentStatus).length;
  const filters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Tất cả" },
    { value: "normal", label: "Ổn định" },
    { value: "warning", label: "Cảnh báo" },
    { value: "fire", label: "Báo cháy" },
    { value: "offline", label: "Ngoại tuyến" },
    { value: "error", label: "Lỗi cảm biến" },
  ];

  return (
    <div className="min-h-screen flex-1 bg-[#f8fafc] text-slate-800">
      <div className="mx-auto w-full max-w-[1220px] space-y-6 px-4 py-5 md:px-8 md:py-7">
        <header>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400"><span>Hệ thống</span><span>/</span><span className="text-slate-600">Cảm biến</span></div>
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Danh sách cảm biến</h1><p className="mt-1 text-sm text-slate-500">Các node đã gửi dữ liệu qua MQTT; trạng thái ngoại tuyến tính từ lần nhận gần nhất.</p></div><Badge variant="secondary" className="border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"><Activity className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />{nodes.length} node thực tế</Badge></div>
        </header>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Node đã ghi nhận", value: countByStatus("all"), note: "Đã gửi ít nhất một bản tin" },
            { title: "Ổn định", value: countByStatus("normal"), note: "Dữ liệu mới trong thời hạn" },
            { title: "Cảnh báo", value: countByStatus("warning") + countByStatus("error"), note: "Cảnh báo hoặc lỗi cảm biến" },
            { title: "Báo cháy / Ngoại tuyến", value: countByStatus("fire") + countByStatus("offline"), note: `${countByStatus("fire")} báo cháy · ${countByStatus("offline")} ngoại tuyến` },
          ].map(({ title, value, note }) => <Card key={title} className="rounded-xl border-slate-200 shadow-none"><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm font-medium text-slate-500">{title}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p></div><span className="rounded-lg bg-blue-50 p-2.5 text-blue-600"><Activity className="h-5 w-5" /></span></CardContent></Card>)}
        </div>

        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none">
          <CardHeader className="gap-4 border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-base font-bold text-slate-900">Các nút cảm biến</CardTitle><p className="mt-1 text-xs text-slate-500">{visibleSensors.length} kết quả</p></div><Link href="/toa-nha" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Xem sơ đồ tòa nhà →</Link></div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo mã cảm biến hoặc phòng..." className="h-10 rounded-lg border-slate-200 pl-9 shadow-none" /></div>
              <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">{filters.map((filter) => <button key={filter.value} type="button" onClick={() => setStatus(filter.value)} aria-pressed={status === filter.value} className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold ${status === filter.value ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{filter.label} <span className="ml-1 opacity-60">{countByStatus(filter.value)}</span></button>)}</div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Node</th><th className="px-5 py-3">Vị trí</th><th className="px-5 py-3">Nhiệt độ</th><th className="px-5 py-3">Khói ADC</th><th className="px-5 py-3">Lửa</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3">Nhận lúc</th><th className="px-5 py-3"><span className="sr-only">Thao tác</span></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleSensors.map(({ node, status: nodeStatus }) => <tr key={node.node_id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`rounded-lg p-2 ${nodeStatus === "fire" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>{nodeStatus === "fire" ? <Flame className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}</span><p className="font-semibold text-slate-800">{node.node_id}</p></div></td>
                    <td className="px-5 py-4 text-slate-600">{getLiveNodeLocation(node.node_id)}</td>
                    <td className="px-5 py-4 font-semibold text-slate-700">{node.sensors.temp === null ? "—" : `${node.sensors.temp.toFixed(1)} °C`}</td>
                    <td className="px-5 py-4 text-slate-600">{node.sensors.smoke_adc} ADC</td>
                    <td className="px-5 py-4 text-slate-600">{node.sensors.flame ? "Phát hiện" : "Không"}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getLiveStatusClass(nodeStatus)}`}>{getLiveStatusLabel(nodeStatus)}</span></td>
                    <td className="px-5 py-4 text-xs text-slate-500">{new Date(node.received_at).toLocaleTimeString("vi-VN")}</td>
                    <td className="px-5 py-4"><Link href={`/cam-bien?node=${encodeURIComponent(node.node_id)}`} className="rounded-md px-2 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50">Chi tiết</Link></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            {visibleSensors.length === 0 && <div className="p-12 text-center"><Search className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">{loading ? "Đang chờ dữ liệu node" : nodes.length ? "Không tìm thấy node phù hợp" : "Chưa nhận được dữ liệu node thực tế"}</p><p className="mt-1 text-sm text-slate-400">Danh sách chỉ hiển thị node đã gửi dữ liệu tới MQTT.</p></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
