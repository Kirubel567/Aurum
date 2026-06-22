"use client";

import { useEffect, useState } from "react";

import * as ws from "@/src/services/realtime/websocket";

export function useRealtime() {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<unknown>(null);

  useEffect(() => {
    ws.connect();
    setConnected(ws.isConnected());

    const unsubscribe = ws.onMessage((msg) => {
      setLastMessage(msg);
    });

    return () => {
      unsubscribe();
      ws.disconnect();
    };
  }, []);

  return { connected, lastMessage };
}
