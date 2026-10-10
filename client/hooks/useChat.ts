import { useState, useEffect, useRef, useCallback } from "react";
import * as Shared from "@enavti/shared-types";

// How long a bubble stays up: longer messages get more time to be read
const BASE_BUBBLE_TIME = 2000;
const BUBBLE_TIME_PER_CHAR = 50;
const MAX_BUBBLE_TIME = 6000;
// After the host reacts to an answer, keep the bubble up at least this long
const VERDICT_BUBBLE_TIME = 2500;

export type ChatBubble = {
  id: number;
  playerId: string;
  message: string;
  timestamp: number;
  // Set when the host judged this message as an answer
  verdict?: "right" | "wrong";
};

let nextBubbleId = 0;

const bubbleTime = (message: string) =>
  Math.min(
    BASE_BUBBLE_TIME + message.length * BUBBLE_TIME_PER_CHAR,
    MAX_BUBBLE_TIME,
  );

export function useChat(socket: any) {
  // Only the latest bubble per player is shown
  const [bubbles, setBubbles] = useState<Record<string, ChatBubble>>({});
  const hideTimers = useRef<Record<string, NodeJS.Timeout>>({});
  // Who the last question was for and when, to know which bubble is the answer
  const lastQuestion = useRef<{ targetPlayer: string; askedAt: number } | null>(
    null,
  );

  const hideLater = useCallback((playerId: string, id: number, ms: number) => {
    clearTimeout(hideTimers.current[playerId]);
    hideTimers.current[playerId] = setTimeout(() => {
      setBubbles((prev) => {
        if (prev[playerId]?.id !== id) return prev;
        const { [playerId]: _, ...rest } = prev;
        return rest;
      });
    }, ms);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleChat = (chatEntry: Shared.ChatMessage) => {
      const bubble: ChatBubble = {
        id: nextBubbleId++,
        playerId: chatEntry.playerId,
        message: chatEntry.message,
        timestamp: Date.now(),
      };
      setBubbles((prev) => ({ ...prev, [bubble.playerId]: bubble }));
      hideLater(bubble.playerId, bubble.id, bubbleTime(bubble.message));
    };

    const handleAnnouncement = (announcement: Shared.Announcement) => {
      if (announcement.type === "question" && announcement.targetPlayer) {
        lastQuestion.current = {
          targetPlayer: announcement.targetPlayer,
          askedAt: Date.now(),
        };
        return;
      }

      if (
        announcement.type !== "right-answer" &&
        announcement.type !== "wrong-answer"
      ) {
        return;
      }

      const question = lastQuestion.current;
      if (!question) return;
      const verdict = announcement.type === "right-answer" ? "right" : "wrong";

      setBubbles((prev) => {
        const bubble = prev[question.targetPlayer];
        // Only a message sent after the question counts as the answer
        if (!bubble || bubble.timestamp < question.askedAt) return prev;
        hideLater(bubble.playerId, bubble.id, VERDICT_BUBBLE_TIME);
        return { ...prev, [bubble.playerId]: { ...bubble, verdict } };
      });
    };

    socket.on("chat-message-broadcast", handleChat);
    socket.on("announcement", handleAnnouncement);

    return () => {
      socket.off("chat-message-broadcast", handleChat);
      socket.off("announcement", handleAnnouncement);
    };
  }, [socket, hideLater]);

  useEffect(() => {
    const timers = hideTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  const getChatBubbleForPlayer = (playerId: string): ChatBubble | undefined =>
    bubbles[playerId];

  const sendMessage = (message: string, lobbyId: string, playerId: string) => {
    if (!socket || !message.trim()) return;

    socket.emit("chat-message-req", {
      lobbyId,
      playerId,
      message: message.trim(),
    });
  };

  return { getChatBubbleForPlayer, sendMessage };
}
