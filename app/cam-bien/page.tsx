"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, Flame, Thermometer, Wind } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveNodes } from "@/hooks/use-live-nodes";
import { useNodeReadings } from "@/hooks/use-node-readings";
import {
  getLiveNodeLocation,
  getLiveNodeStatus,
  getLiveStatusClass,
  getLiveStatusLabel,
} from "@/lib/live-nodes";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

function SensorDetailContent() {
  const searchParams = useSearchParams();
  const nodeId = searchParams.get("node");
  const { nodes, now, loading, error } = useLiveNodes();
  const { readings, loading: historyLoading, error: historyError } =
    useNodeReadings(nodeId ?? undefined, 100);
  const node = nodes.find((item) => item.node_id === nodeId);
  const status = node
    ? getLiveNodeStatus(node, now, Date.parse(node.received_at))
    : null;
  const chartData = useMemo(
    () => [...readings]
      .reverse()
      .filter((reading) => reading.sensors.temp !== null)
      .map((reading) => ({
        time: new Date(reading.received_at).toLocaleTimeString("vi-VN"),
        temp: reading.sensors.temp,
      })),
    [readings],
  );

  if (!nodeId || (!node && !loading)) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center bg-[#f8fafc] p-6">
        <Card className="w-full max-w-lg rounded-xl border-slate-200 shadow-none">
          <CardContent className="p-8 text-center">
            <Activity className="mx-auto h-9 w-9 text-slate-300" />
            <h1 className="mt-4 text-lg font-semibold text-slate-800">
              {nodeId ? "Không tìm thấy node đang hoạt động" : "Chưa chọn node"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {nodeId
                ? "Node này chưa gửi dữ liệu từ khi dịch vụ nhận MQTT khởi động. Màn hình không thay bằng dữ liệu mẫu."
                : "Chọn một node trong danh sách để xem số đo thực tế."}
            </p>
            <a href="/cam-bien/danh-sach" className="mt-5 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700">Mở danh sách cảm biến</a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = node ? [
    { title: "Nhiệt độ", value: node.sensors.temp === null ? "—" : `${node.sensors.temp.toFixed(1)} °C`, icon: Thermometer },
    { title: "Khói ADC", value: `${node.sensors.smoke_adc} ADC`, icon: Wind },
    { title: "Tốc độ tăng nhiệt (RoR)", value: node.analytics.ror === null ? "—" : `${node.analytics.ror.toFixed(2)} °C/phút`, icon: Activity },
    { title: "FRI", value: node.analytics.fri === null ? "—" : node.analytics.fri.toFixed(1), icon: Flame },
  ] : [];

  return (
    <div className="min-h-screen flex-1 space-y-6 bg-[#f8fafc] p-4 text-slate-800 md:p-8">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {historyError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Không tải được lịch sử đo: {historyError}</p>}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400"><span>Cảm biến</span><span>/</span><span className="text-slate-600">{node?.node_id}</span></div><h1 className="text-2xl font-bold tracking-tight text-slate-900">{node?.node_id}</h1><p className="mt-1 text-sm text-slate-500">{node ? getLiveNodeLocation(node.node_id) : "Đang tải dữ liệu node"} · Nhận gần nhất {node ? new Date(node.received_at).toLocaleString("vi-VN") : "—"}</p></div>
        {status && <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getLiveStatusClass(status)}`}>{getLiveStatusLabel(status)}</span>}
      </header>

      {node && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ title, value, icon: Icon }) => <Card key={title} className="rounded-xl border-slate-200 shadow-none"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-semibold text-slate-600">{title}</CardTitle><Icon className="h-5 w-5 text-slate-400" /></CardHeader><CardContent><p className="text-2xl font-bold text-slate-900">{value}</p></CardContent></Card>)}
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7 rounded-xl border-slate-200 shadow-none">
            <CardHeader><CardTitle className="text-base font-bold text-slate-900">Nhiệt độ theo bản ghi thực tế</CardTitle><p className="text-xs text-slate-500">MongoDB lưu tối đa 5 phút; biểu đồ dùng tối đa 100 bản ghi của node.</p></CardHeader>
            <CardContent>
              {chartData.length ? <div className="h-[280px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><XAxis dataKey="time" /><YAxis domain={["auto", "auto"]} /><Tooltip formatter={(value) => [`${value} °C`, "Nhiệt độ"]} /><Line type="monotone" dataKey="temp" stroke="#dc2626" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div> : <div className="flex h-[280px] items-center justify-center text-sm text-slate-500">{historyLoading ? "Đang tải bản ghi thực tế..." : "Chưa có bản ghi nhiệt độ để vẽ biểu đồ."}</div>}
            </CardContent>
          </Card>

          <Card className="lg:col-span-5 rounded-xl border-slate-200 shadow-none">
            <CardHeader><CardTitle className="text-base font-bold text-slate-900">Trạng thái phần cứng nhận được</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Cảm biến lửa", node.sensors.flame ? "Phát hiện" : "Không phát hiện"],
                ["Relay", node.actuators?.relay === undefined ? "Không gửi trường này" : node.actuators.relay ? "Đang bật" : "Đang tắt"],
                ["Buzzer", node.actuators?.buzzer === undefined ? "Không gửi trường này" : node.actuators.buzzer ? "Đang bật" : "Đang tắt"],
                ["Trạng thái firmware", node.status],
                ["Mã lỗi", String(node.error_code)],
                ["MQTT timestamp", String(node.timestamp)],
              ].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"><span className="text-xs font-medium text-slate-500">{label}</span><span className="text-right text-xs font-semibold text-slate-700">{value}</span></div>)}
            </CardContent>
          </Card>
        </div>
      </>}
    </div>
  );
}

export default function SensorDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex-1 bg-[#f8fafc]" />}>
      <SensorDetailContent />
    </Suspense>
  );
}
