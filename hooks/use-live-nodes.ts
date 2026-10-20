"use client";

import { useEffect, useState } from "react";
import { isLiveNode, type LiveNode } from "@/lib/live-nodes";

const refreshInterval = 3000;

export function useLiveNodes() {
  const [nodes, setNodes] = useState<LiveNode[]>([]);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let activeRequest: AbortController | undefined;

    const load = async () => {
      activeRequest = new AbortController();
      try {
        const response = await fetch("/api/nodes", {
          cache: "no-store",
          signal: activeRequest.signal,
        });
        if (!response.ok) {
          throw new Error(`API trả về lỗi HTTP ${response.status}.`);
        }

        const payload: unknown = await response.json();
        if (typeof payload !== "object" || payload === null) {
          throw new Error("API trả về dữ liệu không hợp lệ.");
        }
        const result = payload as {
          success?: unknown;
          message?: unknown;
          nodes?: unknown;
        };
        if (result.success !== true) {
          throw new Error(
            typeof result.message === "string"
              ? result.message
              : "Không thể lấy dữ liệu node.",
          );
        }
        if (!Array.isArray(result.nodes) || !result.nodes.every(isLiveNode)) {
          throw new Error("Dữ liệu node từ API không đúng định dạng.");
        }

        if (disposed) return;
        setNodes(result.nodes);
        setNow(Date.now());
        setLoading(false);
        setError(null);
      } catch (cause) {
        if (disposed || (cause instanceof Error && cause.name === "AbortError")) {
          return;
        }
        setLoading(false);
        setError(
          cause instanceof Error ? cause.message : "Không thể lấy dữ liệu node.",
        );
      } finally {
        if (!disposed) timer = setTimeout(load, refreshInterval);
      }
    };

    void load();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      activeRequest?.abort();
    };
  }, []);

  return { nodes, now, loading, error };
}
