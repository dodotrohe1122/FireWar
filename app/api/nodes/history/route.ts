import { NextResponse } from "next/server";
import { getNodeReadingsCollection } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const defaultLimit = 100;
const maximumLimit = 500;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, maximumLimit)
      : defaultLimit;
  const nodeId = searchParams.get("node_id")?.trim();

  try {
    const collection = await getNodeReadingsCollection();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const readings = await collection
      .find({
        received_at: { $gt: fiveMinutesAgo },
        ...(nodeId ? { node_id: nodeId } : {}),
      })
      .sort({ received_at: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      count: readings.length,
      readings: readings.map(({ _id, ...reading }) => ({
        ...reading,
        _id: _id.toString(),
      })),
    });
  } catch (error) {
    console.error("[API /api/nodes/history]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể đọc lịch sử dữ liệu từ MongoDB.",
      },
      { status: 500 },
    );
  }
}
