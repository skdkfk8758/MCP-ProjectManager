"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsClient } from "./websocket";

export function useWebSocketBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    wsClient.connect();

    const unsubProject = wsClient.on("project", () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    const unsubTask = wsClient.on("task", () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    const unsubSession = wsClient.on("session", () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    const unsubEvent = wsClient.on("event", () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    const unsubStats = wsClient.on("stats", () => {
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    return () => {
      unsubProject();
      unsubTask();
      unsubSession();
      unsubEvent();
      unsubStats();
      wsClient.disconnect();
    };
  }, [queryClient]);
}
