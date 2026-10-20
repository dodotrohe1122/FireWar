
import { NextResponse } from "next/server";
import { getNodeReadingsCollection } from "@/lib/mongodb";
import type { NodeReading } from "@/models/node-reading";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const collection = await getNodeReadingsCollection();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const latestReadings = await collection
      .aggregate<NodeReading>([
        { $match: { received_at: { $gt: fiveMinutesAgo } } },
        { $sort: { node_id: 1, received_at: -1 } },
        { $group: { _id: "$node_id", reading: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$reading" } },
      ])
      .toArray();
    const nodes = latestReadings.map(({ _id, received_at, ...reading }) => ({
      ...reading,
      received_at: received_at.toISOString(),
      _id: _id.toString(),
    }));

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
        message: "Không thể lấy dữ liệu node từ MongoDB.",
      },
      { status: 500 }
    );
  }
}
