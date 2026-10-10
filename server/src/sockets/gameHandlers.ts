// start-game

import type { Socket } from "socket.io";
import { lobbies } from "../lobbies";
import { MIN_PLAYERS } from "../config";
import { canStartGame, startGame } from "../game/startGame";

export const registerGameHandlers = (socket: Socket) => {
  socket.on("start-game", ({ lobbyId }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;

    // Only the host (first player) can start
    if (socket.id !== lobby.players[0]?.id) return;

    if (!canStartGame(lobby)) {
      socket.emit("error", {
        message: `You need at least ${MIN_PLAYERS} players to start`,
      });
      return;
    }

    startGame(lobby);
  });
};
