// lobby-update-req, join-lobby, disconnect

import type { Socket } from "socket.io";
import { STARTING_LIVES } from "../config";
import { emitLobbyUpdate } from "../emit";
import { lobbies } from "../lobbies";

export const registerLobbyHandlers = (socket: Socket) => {
  socket.on("lobby-update-req", ({ lobbyId }) => {
    const lobby = lobbies.get(lobbyId);

    if (!lobby) {
      socket.emit("error", { message: "Lobby not found" });
      return;
    }

    console.log(`[Server] Sending lobby update to ${socket.id}`);
    socket.emit("lobby-update", {
      players: lobby.players,
      gameState: lobby.gameState,
    });
  });

  socket.on("join-lobby", ({ lobbyId, playerName, character }) => {
    const lobby = lobbies.get(lobbyId);

    if (!lobby) {
      socket.emit("error", { message: "Lobby not found" });
      return;
    }

    const existingPlayer = lobby.players.find((p) => p.id === socket.id);

    if (existingPlayer) {
      existingPlayer.name = playerName;
    } else {
      // Joining a game that's already running = spectating
      const spectating = lobby.gameState !== "lobby";
      lobby.players.push({
        id: socket.id,
        name: playerName,
        lives: spectating ? 0 : STARTING_LIVES,
        eliminated: spectating,
        character: {
          character: character.character,
          clothesColor: character.clothesColor,
        },
      });
    }

    socket.join(lobbyId);
    emitLobbyUpdate(lobby);

    console.log(
      `[Server] Player ${playerName} (${socket.id}) joined lobby ${lobbyId}`
    );
  });

  // Remove the player from their lobby, delete the lobby if it's now empty
  socket.on("disconnect", () => {
    console.log(`[Server] Client disconnected: ${socket.id}`);

    lobbies.forEach((lobby, lobbyId) => {
      const playerIndex = lobby.players.findIndex((p) => p.id === socket.id);
      if (playerIndex === -1) return;

      const [player] = lobby.players.splice(playerIndex, 1);
      console.log(`[Server] ${player.name} left ${lobbyId}`);

      emitLobbyUpdate(lobby);

      if (lobby.players.length === 0) {
        lobbies.delete(lobbyId);
        console.log(`[Server] Deleted empty lobby ${lobbyId}`);
      }
    });
  });
};
