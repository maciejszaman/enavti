"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      socket = io({
        path: "/api/socketio",
      });

      socket.on("connect", () => {
        console.log("[Server] Socket connected:", socket?.id);
        setIsConnected(true);
      });

      socket.on("disconnect", () => {
        console.log("[Server] Socket disconnected");
        setIsConnected(false);
      });
    }

    return () => {};
  }, []);

  return socket;
}
