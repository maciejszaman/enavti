import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import * as Shared from "@enavti/shared-types";
import { playSound, preloadSounds } from "@/lib/sound";
import { isMutedChat } from "@/lib/gameRules";

export function useGameSounds(
  socket: Socket | null,
  players: Shared.Player[],
  gameState: Shared.GameState,
) {
  const prevPlayerCount = useRef<number | null>(null);
  // Latest state for the socket handlers
  const latest = useRef({ players, gameState });
  latest.current = { players, gameState };

  useEffect(() => {
    preloadSounds();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleAnnouncement = (announcement: Shared.Announcement) => {
      switch (announcement.type) {
        case "question":
          playSound("question");
          break;
        case "right-answer":
          playSound("rightAnswer");
          break;
        case "wrong-answer":
          playSound("wrongAnswer");
          break;
        case "game-start":
          playSound("gameStart");
          break;
        case "info":
          playSound("info");
          break;
        // Shuffling players before round one, summary between round one and two
        case "modal":
          playSound("betweenRounds");
          break;
      }
    };

    const handleChat = (message: Shared.ChatMessage) => {
      const { players, gameState } = latest.current;
      if (isMutedChat(players, gameState, message.playerId, socket.id)) return;
      playSound("chat");
    };

    socket.on("announcement", handleAnnouncement);
    socket.on("chat-message-broadcast", handleChat);

    return () => {
      socket.off("announcement", handleAnnouncement);
      socket.off("chat-message-broadcast", handleChat);
    };
  }, [socket]);

  // Someone joined while gathering players
  useEffect(() => {
    const prev = prevPlayerCount.current;
    prevPlayerCount.current = players.length;

    if (gameState === "lobby" && prev !== null && players.length > prev) {
      playSound("playerJoined");
    }
  }, [players.length, gameState]);
}
