import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import * as Shared from "@enavti/shared-types";
import { playSound, preloadSounds } from "@/lib/sound";

export function useGameSounds(
  socket: Socket | null,
  players: Shared.Player[],
  gameState: Shared.GameState,
) {
  const prevPlayerCount = useRef<number | null>(null);

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
      }
    };

    const handleChat = () => playSound("chat");

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
