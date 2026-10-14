
import { NextResponse } from "next/server";
import { getMqttClient, getNodeData } from "@/lib/mqtt-subscriber";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Khởi tạo MQTT subscriber
    getMqttClient();

    // Lấy dữ liệu mới nhất từ các node
    const nodes = getNodeData();

    return NextResponse.json({
      success: true,
      count: nodes.length,
      nodes,
    });
  } catch (error) {
    console.error("[API /api/nodes]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể lấy dữ liệu node",
      },
      { status: 500 }
    );
  }
}
