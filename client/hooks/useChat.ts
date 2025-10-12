import { useState, useEffect } from "react";
import * as Shared from "../../lib/types/Shared.types";

export function useChat(socket: any) {
  const [chatMessages, setChatMessages] = useState<Shared.ChatMessage[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleChat = (chatEntry: Shared.ChatMessage) => {
      const newMsg: Shared.ChatMessage = {
        playerId: chatEntry.playerId,
        playerName: chatEntry.playerName,
        message: chatEntry.message,
        timestamp: Date.now(),
        visible: true,
      };
      setChatMessages((prev) => [...prev, newMsg]);
    };

    socket.on("chat-message-broadcast", handleChat);

    return () => {
      socket.off("chat-message-broadcast", handleChat);
    };
  }, [socket]);

  useEffect(() => {
    const updateVisible = () => {
      setChatMessages((msgs) =>
        msgs.map((msg) =>
          Date.now() - msg.timestamp > 2000 ? { ...msg, visible: false } : msg
        )
      );
    };

    updateVisible();
    const interval = setInterval(updateVisible, 500);
    return () => clearInterval(interval);
  }, []);

  const getChatBubbleForPlayer = (playerId: string) => {
    return chatMessages
      .filter((msg) => msg.playerId === playerId && msg.visible)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
  };

  const sendMessage = (message: string, lobbyId: string, playerId: string) => {
    if (!socket || !message.trim()) return;

    socket.emit("chat-message-req", {
      lobbyId,
      playerId,
      message: message.trim(),
    });
  };

  return { chatMessages, getChatBubbleForPlayer, sendMessage };
}
