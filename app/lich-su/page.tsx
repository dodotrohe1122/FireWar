"use client";

import { useState } from "react";
import { Download, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNodeReadings } from "@/hooks/use-node-readings";
import {
  getLiveNodeLocation,
  getLiveStatusClass,
  getLiveStatusLabel,
  getReportedNodeStatus,
  type LiveNodeStatus,
} from "@/lib/live-nodes";

type HistoryFilter = "Tất cả" | LiveNodeStatus;
const filters: HistoryFilter[] = [
  "Tất cả",
  "fire",
  "warning",
  "error",
  "normal",
];
const filterLabels: Record<HistoryFilter, string> = {
  "Tất cả": "Tất cả",
  fire: "Báo cháy",
  warning: "Cảnh báo",
  error: "Lỗi cảm biến",
  offline: "Ngoại tuyến",
  normal: "Ổn định",
};

export default function HistoryPage() {
  const { readings, loading, error } = useNodeReadings(undefined, 500);
  const [filter, setFilter] = useState<HistoryFilter>("Tất cả");
  const [query, setQuery] = useState("");
  const recordedReadings = readings.map((reading) => ({
    reading,
    status: getReportedNodeStatus(reading),
  }));
  const filteredReadings = recordedReadings.filter(({ reading, status }) => {
      const matchesType = filter === "Tất cả" || status === filter;
      const matchesQuery = `${reading.node_id} ${getLiveNodeLocation(reading.node_id)} ${reading.status}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return matchesType && matchesQuery;
    });

  const exportHistory = () => {
    const rows = [
      ["Thời gian nhận", "Node", "Vị trí", "Trạng thái", "Nhiệt độ", "Khói ADC", "Lửa", "MQTT topic"],
      ...filteredReadings.map(({ reading, status }) => [
        new Date(reading.received_at).toLocaleString("vi-VN"),
        reading.node_id,
        getLiveNodeLocation(reading.node_id),
        getLiveStatusLabel(status),
        reading.sensors.temp === null ? "" : String(reading.sensors.temp),
        String(reading.sensors.smoke_adc),
        reading.sensors.flame ? "Có" : "Không",
        reading.topic,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "firewar-node-readings.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const count = (status: LiveNodeStatus) =>
    recordedReadings.filter((item) => item.status === status).length;

  return (
    <div className="min-h-screen flex-1 bg-[#f8fafc] text-slate-800">
      <div className="mx-auto w-full max-w-[1220px] space-y-6 px-4 py-5 md:px-8 md:py-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400"><span>Hệ thống</span><span>/</span><span className="text-slate-600">Lịch sử</span></div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Lịch sử dữ liệu node</h1><p className="mt-1 text-sm text-slate-500">Các bản tin thực tế được lưu từ MQTT trong MongoDB; dữ liệu tự làm mới mỗi 5 giây.</p></div>
          <button type="button" onClick={exportHistory} disabled={!filteredReadings.length} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />Xuất CSV</button>
        </header>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">MongoDB hiện tự xóa bản ghi sau 5 phút; lịch sử hiển thị tối đa 500 bản ghi mới nhất trong khoảng thời gian còn lưu.</div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Bản tin thực tế", value: readings.length, tone: "text-slate-900" },
            { label: "Báo cháy", value: count("fire"), tone: "text-red-600" },
            { label: "Cảnh báo", value: count("warning"), tone: "text-amber-600" },
            { label: "Lỗi cảm biến", value: count("error"), tone: "text-slate-600" },
          ].map((stat) => <Card key={stat.label} className="rounded-xl border-slate-200 shadow-none"><CardContent className="p-5"><p className="text-sm text-slate-500">{stat.label}</p><p className={`mt-2 text-3xl font-bold ${stat.tone}`}>{stat.value}</p></CardContent></Card>)}
        </div>

        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none">
          <CardHeader className="gap-4 border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-base font-bold text-slate-900">Bản ghi nhận từ MQTT</CardTitle><p className="mt-1 text-xs text-slate-500">{filteredReadings.length} bản ghi phù hợp</p></div><p className="text-xs text-slate-500">Không tạo sự kiện khôi phục/ngoại tuyến nếu không có bản tin tương ứng.</p></div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo node hoặc vị trí..." className="h-10 rounded-lg border-slate-200 pl-9 shadow-none" /></div>
              <label className="relative"><span className="sr-only">Lọc theo trạng thái</span><select value={filter} onChange={(event) => setFilter(event.target.value as HistoryFilter)} className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-600 outline-none focus:border-blue-500 sm:w-52">{filters.map((item) => <option key={item} value={item}>{filterLabels[item]}</option>)}</select></label>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Thời gian nhận</th><th className="px-5 py-3">Node / Vị trí</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3">Nhiệt độ</th><th className="px-5 py-3">Khói ADC</th><th className="px-5 py-3">Lửa</th><th className="px-5 py-3">Topic</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredReadings.map(({ reading, status }) => <tr key={reading._id} className="hover:bg-slate-50/70"><td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{new Date(reading.received_at).toLocaleString("vi-VN")}</td><td className="px-5 py-4"><p className="font-semibold text-slate-700">{reading.node_id}</p><p className="mt-1 text-xs text-slate-400">{getLiveNodeLocation(reading.node_id)}</p></td><td className="px-5 py-4"><span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${getLiveStatusClass(status)}`}>{getLiveStatusLabel(status)}</span></td><td className="px-5 py-4 text-slate-600">{reading.sensors.temp === null ? "—" : `${reading.sensors.temp.toFixed(1)} °C`}</td><td className="px-5 py-4 text-slate-600">{reading.sensors.smoke_adc} ADC</td><td className="px-5 py-4 text-slate-600">{reading.sensors.flame ? "Phát hiện" : "Không"}</td><td className="px-5 py-4 text-xs text-slate-500">{reading.topic}</td></tr>)}</tbody></table></div>
            {filteredReadings.length === 0 && <div className="p-12 text-center"><p className="font-semibold text-slate-700">{loading ? "Đang tải bản ghi" : readings.length ? "Không tìm thấy bản ghi phù hợp" : "Chưa có bản ghi thật trong MongoDB"}</p><p className="mt-1 text-sm text-slate-400">Kiểm tra kết nối MQTT và cấu hình MongoDB nếu bạn kỳ vọng có dữ liệu.</p></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
