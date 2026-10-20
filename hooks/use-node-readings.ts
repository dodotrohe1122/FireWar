"use client";

import { useEffect, useState } from "react";
import { isLiveNode, type LiveNode } from "@/lib/live-nodes";

export interface StoredNodeReading extends LiveNode {
  _id: string;
  topic: string;
}

function isStoredNodeReading(value: unknown): value is StoredNodeReading {
  if (
    !isLiveNode(value) ||
    typeof value !== "object" ||
    value === null ||
    !("_id" in value) ||
    !("topic" in value)
  ) {
    return false;
  }
  return typeof value._id === "string" && typeof value.topic === "string";
}

export function useNodeReadings(nodeId?: string, limit = 100) {
  const [readings, setReadings] = useState<StoredNodeReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let activeRequest: AbortController | undefined;

    const load = async () => {
      activeRequest = new AbortController();
      try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (nodeId) params.set("node_id", nodeId);
        const response = await fetch(`/api/nodes/history?${params}`, {
          cache: "no-store",
          signal: activeRequest.signal,
        });
        if (!response.ok) {
          throw new Error(`API lịch sử trả về lỗi HTTP ${response.status}.`);
        }

        const payload: unknown = await response.json();
        if (typeof payload !== "object" || payload === null) {
          throw new Error("API lịch sử trả về dữ liệu không hợp lệ.");
        }
        const result = payload as {
          success?: unknown;
          message?: unknown;
          readings?: unknown;
        };
        if (result.success !== true) {
          throw new Error(
            typeof result.message === "string"
              ? result.message
              : "Không thể đọc lịch sử dữ liệu.",
          );
        }
        if (!Array.isArray(result.readings)) {
          throw new Error("Dữ liệu lịch sử từ API không đúng định dạng.");
        }
        const validReadings = result.readings.filter(isStoredNodeReading);
        if (validReadings.length !== result.readings.length) {
          throw new Error("Dữ liệu lịch sử từ API không đúng định dạng.");
        }

        if (disposed) return;
        setReadings(validReadings);
        setLoading(false);
        setError(null);
      } catch (cause) {
        if (disposed || (cause instanceof Error && cause.name === "AbortError")) {
          return;
        }
        setLoading(false);
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể đọc lịch sử dữ liệu.",
        );
      } finally {
        if (!disposed) timer = setTimeout(load, 5000);
      }
    };

    void load();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      activeRequest?.abort();
    };
  }, [limit, nodeId]);

  return { readings, loading, error };
}
