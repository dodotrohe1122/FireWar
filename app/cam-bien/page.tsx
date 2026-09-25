"use client";

import {
    Thermometer,
    Wind,
    Activity,
    Flame,
    AlertTriangle,
    RotateCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";


const sensorDetail = {
    nodeId: "NODE_03",
    location: "Tầng 3 — Phòng 305",
    lastUpdate: "07:31:15",
    status: "CRITICAL", // CRITICAL | WARNING | NORMAL
    statusText: "TRẠNG THÁI: BÁO CHÁY (CRITICAL)",
    metrics: {
        temperature: {
            value: 72.5,
            unit: "°C",
            note: "Ngưỡng nguy hiểm (>60°C)",
            level: "danger",
        },
        smoke: {
            value: 850,
            unit: "ppm",
            note: "Nồng độ cực cao",
            level: "danger",
        },
        co: {
            value: 120,
            unit: "ppm",
            note: "Ngưỡng cảnh báo",
            level: "warning",
        },
        fri: {
            score: 96,
            maxScore: 100,
            note: "Mức cực kỳ khẩn cấp",
            level: "danger",
        },
    },
    chartData: [
        { time: "07:25", temp: 28 },
        { time: "07:26", temp: 30 },
        { time: "07:27", temp: 35 },
        { time: "07:28", temp: 42 },
        { time: "07:29", temp: 53 },
        { time: "07:30", temp: 60 },
        { time: "07:31", temp: 72.5 },
    ],
    hardwareDiagnostics: [
        { label: "Cảm biến lửa", value: "PHÁT HIỆN LỬA", status: "danger" },
        { label: "Nhiệt độ tức thời (ΔT/Δt)", value: "TĂNG ĐỘT NGỘT", status: "danger" },
        { label: "Dòng điện cung cấp", value: "12.4 mA (Ổn định)", status: "normal" },
        { label: "Dung lượng pin dự phòng", value: "94% (Bình thường)", status: "normal" },
    ],
};

export default function SensorDetailPage() {
    const handleResetNode = () => {
        alert(`Đã gửi lệnh khởi động lại ${sensorDetail.nodeId}`);
    };

    return (
        <div className="flex-1 space-y-6 p-8 bg-[#f8fafc] min-h-screen text-slate-800">
            {/* Breadcrumb & Top Status Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <span>Cảm biến</span>
                    <span>/</span>
                    <span className="text-slate-900 font-bold">
                        {sensorDetail.nodeId}
                    </span>
                </div>

                {/* Global Danger Badge */}
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-red-50 border border-red-300 text-red-600 font-bold text-xs">
                    <Flame className="w-4 h-4 fill-red-600" />
                    <span>{sensorDetail.statusText}</span>
                </div>
            </div>

            {/* Node Header Info Card */}
            <Card className="shadow-none border-slate-200/80 rounded-xl">
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Cảm biến {sensorDetail.nodeId}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Vị trí: {sensorDetail.location} — Cập nhật cuối:{" "}
                            {sensorDetail.lastUpdate}
                        </p>
                    </div>
                    <Button
                        onClick={handleResetNode}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2 px-4 py-2 text-sm rounded-lg"
                    >
                        <RotateCw className="w-4 h-4" />
                        Khởi động lại nút
                    </Button>
                </CardContent>
            </Card>

            {/* 4 Cards Chỉ Số (Metrics) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* 1. Nhiệt độ */}
                <Card className="shadow-none border-slate-200/80 rounded-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-600">
                            Nhiệt độ
                        </CardTitle>
                        <div className="p-2 bg-red-100/60 rounded-lg text-red-600">
                            <Thermometer className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-slate-900">
                            {sensorDetail.metrics.temperature.value}{" "}
                            <span className="text-2xl">
                                {sensorDetail.metrics.temperature.unit}
                            </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 mt-2 flex items-center gap-1.5">
                            <span className="w-2.5 h-[2px] bg-red-500 inline-block"></span>
                            {sensorDetail.metrics.temperature.note}
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Nồng độ khói */}
                <Card className="shadow-none border-slate-200/80 rounded-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-600">
                            Nồng độ khói
                        </CardTitle>
                        <div className="p-2 bg-red-100/60 rounded-lg text-red-600">
                            <Wind className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-slate-900">
                            {sensorDetail.metrics.smoke.value}{" "}
                            <span className="text-2xl">
                                {sensorDetail.metrics.smoke.unit}
                            </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 mt-2 flex items-center gap-1.5">
                            <span className="w-2.5 h-[2px] bg-red-500 inline-block"></span>
                            {sensorDetail.metrics.smoke.note}
                        </p>
                    </CardContent>
                </Card>

                {/* 3. Khí CO */}
                <Card className="shadow-none border-slate-200/80 rounded-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-600">
                            Khí CO
                        </CardTitle>
                        <div className="p-2 bg-amber-100/60 rounded-lg text-amber-600">
                            <Activity className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-slate-900">
                            {sensorDetail.metrics.co.value}{" "}
                            <span className="text-2xl">
                                {sensorDetail.metrics.co.unit}
                            </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 mt-2 flex items-center gap-1.5">
                            <span className="w-2.5 h-[2px] bg-amber-500 inline-block"></span>
                            {sensorDetail.metrics.co.note}
                        </p>
                    </CardContent>
                </Card>

                {/* 4. Chỉ số Nguy cơ FRI (Chỉ số màu đỏ cảnh báo) */}
                <Card className="shadow-none border-2 border-red-500 bg-red-50/20 rounded-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold text-red-600">
                            Chỉ số Nguy cơ FRI
                        </CardTitle>
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-red-600">
                            {sensorDetail.metrics.fri.score} /{" "}
                            {sensorDetail.metrics.fri.maxScore}
                        </div>
                        <p className="text-xs font-bold text-red-600 mt-2">
                            {sensorDetail.metrics.fri.note}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Grid: Biểu đồ & Chẩn đoán phần cứng */}
            <div className="grid gap-6 md:grid-cols-12">
                {/* Cột Trái: Biểu đồ (7 cols) */}
                <Card className="md:col-span-7 shadow-none border-slate-200/80 rounded-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold text-slate-900">
                            Biểu đồ gia tăng nhiệt độ thực tế
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={sensorDetail.chartData}>
                                    <XAxis dataKey="time" hide />
                                    <YAxis hide domain={["auto", "auto"]} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#ffffff",
                                            borderRadius: "8px",
                                            border: "1px solid #e2e8f0",
                                            fontSize: "12px",
                                        }}
                                        formatter={(value: any) => [`${value} °C`, "Nhiệt độ"]}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="temp"
                                        stroke="#dc2626"
                                        strokeWidth={3}
                                        dot={{
                                            r: 0,
                                        }}
                                        activeDot={{
                                            r: 6,
                                            fill: "#dc2626",
                                            stroke: "#ffffff",
                                            strokeWidth: 2,
                                        }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Cột Phải: Chẩn đoán phần cứng (5 cols) */}
                <Card className="md:col-span-5 shadow-none border-slate-200/80 rounded-xl">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base font-bold text-slate-900">
                            Chẩn đoán phần cứng
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                        {sensorDetail.hardwareDiagnostics.map((item, idx) => {
                            const isDanger = item.status === "danger";

                            return (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-xl border border-slate-100"
                                >
                                    <span className="text-xs font-medium text-slate-600">
                                        {item.label}
                                    </span>
                                    <span
                                        className={`text-xs font-bold ${isDanger ? "text-red-600" : "text-emerald-600"
                                            }`}
                                    >
                                        {item.value}
                                    </span>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}