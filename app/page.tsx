"use client";

import React from "react";
import { Boxes, CheckCircle2, AlertTriangle, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const trendData = [
  { time: "07:01", temp: 28, fri: 15 },
  { time: "07:05", temp: 32, fri: 18 },
  { time: "07:10", temp: 35, fri: 20 },
  { time: "07:15", temp: 42, fri: 30 },
  { time: "07:20", temp: 50, fri: 48 },
  { time: "07:25", temp: 65, fri: 62 },
  { time: "07:30", temp: 70, fri: 80 },
  { time: "07:31", temp: 72.5, fri: 96 },
];

const statsData = {
  totalSensors: 12,
  activeNormal: 11,
  warningCount: 2,
  fireCount: 1,
};

type RoomStatus = "normal" | "warning" | "fire";

interface RoomItem {
  id: string;
  name: string;
  status: RoomStatus;
  temp: number;
}

const roomsData: RoomItem[] = [
  { id: "301", name: "Phòng 301", status: "normal", temp: 26.5 },
  { id: "302", name: "Phòng 302", status: "warning", temp: 42.0 },
  { id: "303", name: "Phòng 303", status: "normal", temp: 25.0 },
  { id: "304", name: "Phòng 304", status: "normal", temp: 24.8 },
  { id: "305", name: "Phòng 305", status: "fire", temp: 72.5 },
  { id: "306", name: "Phòng 306", status: "normal", temp: 27.0 },
];

type AlertType = "CHÁY" | "CẢNH BÁO" | "NGOẠI TUYẾN";

interface RecentAlert {
  id: string;
  nodeId: string;
  roomName: string;
  time: string;
  type: AlertType;
}

const recentAlertsData: RecentAlert[] = [
  {
    id: "1",
    nodeId: "NODE_03",
    roomName: "Phòng 305",
    time: "07:31:15",
    type: "CHÁY",
  },
  {
    id: "2",
    nodeId: "NODE_05",
    roomName: "Phòng 502",
    time: "07:28:11",
    type: "CẢNH BÁO",
  },
  {
    id: "3",
    nodeId: "NODE_07",
    roomName: "Phòng 704",
    time: "07:20:03",
    type: "NGOẠI TUYẾN",
  },
];


export default function DashboardPage() {

  const getRoomStyle = (status: RoomStatus) => {
    switch (status) {
      case "normal":
        return {
          container: "bg-[#e8f5e9]/50 border-[#81c784] text-[#1b5e20]",
          label: "Ổn định",
        };
      case "warning":
        return {
          container: "bg-[#fff8e1]/60 border-[#fbc02d] text-[#b78103]",
          label: "Cảnh báo",
        };
      case "fire":
        return {
          container: "bg-[#ffebee]/80 border-[#e53935] text-[#c62828]",
          label: "CHÁY",
        };
    }
  };


  const getBadgeStyle = (type: AlertType) => {
    switch (type) {
      case "CHÁY":
        return {
          dot: "bg-red-500",
          badge: "bg-red-100 text-red-600 border-transparent font-bold",
        };
      case "CẢNH BÁO":
        return {
          dot: "bg-amber-500",
          badge: "bg-amber-100 text-amber-700 border-transparent font-bold",
        };
      case "NGOẠI TUYẾN":
        return {
          dot: "bg-slate-400",
          badge: "bg-slate-100 text-slate-500 border-transparent font-bold",
        };
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 bg-[#f8fafc] min-h-screen text-slate-800">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Tổng quan hệ thống
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Giám sát thời gian thực toàn bộ cảm biến tại tòa nhà.
        </p>
      </div>

      {/* 4 Stat Cards Top */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <Card className="shadow-none border-slate-200/80 rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              Tổng cảm biến
            </CardTitle>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Boxes className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900">
              {statsData.totalSensors}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="w-2.5 h-[2px] bg-slate-500 inline-block"></span>{" "}
              Toàn bộ nút
            </p>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card className="shadow-none border-slate-200/80 rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              Hoạt động
            </CardTitle>
            <div className="p-2 bg-emerald-100/60 rounded-lg text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900">
              {statsData.activeNormal}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="w-2.5 h-[2px] bg-emerald-500 inline-block"></span>{" "}
              Bình thường
            </p>
          </CardContent>
        </Card>

        {/* Card 3 */}
        <Card className="shadow-none border-slate-200/80 rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              Cảnh báo
            </CardTitle>
            <div className="p-2 bg-amber-100/60 rounded-lg text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900">
              {statsData.warningCount}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="w-2.5 h-[2px] bg-amber-500 inline-block"></span>{" "}
              Nhiệt độ/Khói cao
            </p>
          </CardContent>
        </Card>

        {/* Card 4 */}
        <Card className="shadow-none border-slate-200/80 rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              Báo cháy
            </CardTitle>
            <div className="p-2 bg-red-100/60 rounded-lg text-red-600">
              <Flame className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900">
              {statsData.fireCount}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="w-2.5 h-[2px] bg-red-500 inline-block"></span>{" "}
              Nguy cơ khẩn cấp
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Sơ đồ tầng 3 & Báo động gần đây */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column: Sơ đồ tầng 3 (7 col) */}
        <Card className="md:col-span-7 shadow-none border-slate-200/80 rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-bold text-slate-900">
              Sơ đồ tầng 3
            </CardTitle>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              <span>PHÁT HIỆN SỰ CỐ</span>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 pt-2">
            {roomsData.map((room) => {
              const style = getRoomStyle(room.status);

              return (
                <div
                  key={room.id}
                  className={`border-2 rounded-xl p-4 text-center transition-all ${style.container}`}
                >
                  <div className="font-bold text-sm text-slate-900 flex items-center justify-center gap-1">
                    {room.status === "fire" && (
                      <Flame className="w-4 h-4 text-red-600 fill-red-600" />
                    )}
                    <span>{room.name}</span>
                  </div>
                  <div className="text-xs font-medium mt-1">
                    {style.label} — {room.temp.toFixed(1)} °C
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Right Column: Báo động gần đây (5 col) */}
        <Card className="md:col-span-5 shadow-none border-slate-200/80 rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-bold text-slate-900">
              Báo động gần đây
            </CardTitle>
            <Button
              variant="link"
              className="text-xs text-blue-600 hover:text-blue-700 h-auto p-0 font-medium"
            >
              Xem tất cả
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {recentAlertsData.map((alert) => {
              const badgeStyle = getBadgeStyle(alert.type);

              return (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-xl border border-slate-100"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 ${badgeStyle.dot}`}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {alert.nodeId} — {alert.roomName}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {alert.time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-2 py-0.5 rounded-md ${badgeStyle.badge}`}
                    >
                      {alert.type}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Xem
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      <Card className="w-full shadow-none border-slate-200/80 rounded-xl">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-base font-bold text-slate-900">
            Xu hướng Nhiệt độ & Nguy cơ Cháy (FRI)
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Phân tích dữ liệu đồng bộ trong 30 phút qua
          </p>
        </div>

        {/* Custom Legend */}
        <div className="flex items-center gap-5 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-[3px] bg-[#2563eb] rounded-full inline-block"></span>
            <span>Nhiệt độ (°C)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-[3px] bg-[#f59e0b] rounded-full inline-block"></span>
            <span>Chỉ số FRI (0-100)</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                dy={10}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  fontSize: "12px",
                }}
              />

              {/* Đường 1: Nhiệt độ (°C) - Màu Xanh */}
              <Line
                type="monotone"
                dataKey="temp"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "#dc2626",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
              />

              {/* Đường 2: Chỉ số FRI - Màu Cam */}
              <Line
                type="monotone"
                dataKey="fri"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
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
    </div>
  );
}