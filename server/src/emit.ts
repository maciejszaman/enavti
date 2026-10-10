// Small helpers for the socket events we send over and over.
// `room` is a lobby id (whole lobby) or a socket id (one player).

import type * as Shared from "@enavti/shared-types";
import { io } from "./io";

export const emitLobbyUpdate = (lobby: Shared.Lobby) => {
  io.to(lobby.id).emit("lobby-update", {
    players: lobby.players,
    gameState: lobby.gameState,
  });
};

export const announce = (room: string, announcement: Shared.Announcement) => {
  io.to(room).emit("announcement", announcement);
};

export const broadcastChat = (
  lobbyId: string,
  player: Shared.Player,
  message: string
) => {
  io.to(lobbyId).emit("chat-message-broadcast", {
    playerId: player.id,
    playerName: player.name,
    message,
    timestamp: Date.now(),
  } as Shared.ChatMessage);
};

// Stops and hides the answer timer on all clients
export const resetTimerDisplay = (lobbyId: string) => {
  io.to(lobbyId).emit("timer-stop");
  io.to(lobbyId).emit("timer-update", {
    timeRemaining: 0,
    totalTime: 0,
    targetPlayer: "",
  } as Shared.TimerUpdate);
};
