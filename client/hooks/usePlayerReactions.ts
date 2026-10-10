import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import * as Shared from "@enavti/shared-types";

// Player id -> a number that changes every time they send a chat message,
// so the character's "talk" animation replays even for back-to-back messages
export function usePlayerReactions(socket: Socket | null) {
  const [talking, setTalking] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!socket) return;

    const handleChat = (message: Shared.ChatMessage) =>
      setTalking((prev) => ({
        ...prev,
        [message.playerId]: (prev[message.playerId] ?? 0) + 1,
      }));

    socket.on("chat-message-broadcast", handleChat);

    return () => {
      socket.off("chat-message-broadcast", handleChat);
    };
  }, [socket]);

  return talking;
}
