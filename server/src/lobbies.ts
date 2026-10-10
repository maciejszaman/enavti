// In-memory lobby storage. Everything is lost on server restart.

import type * as Shared from "@enavti/shared-types";

export const lobbies = new Map<string, Shared.Lobby>();

//SHORT RANDOM ID
const generateLobbyId = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createLobby = (): Shared.Lobby => {
  const lobby: Shared.Lobby = {
    id: generateLobbyId(),
    players: [],
    createdAt: new Date(),
    gameState: "lobby",
  };

  lobbies.set(lobby.id, lobby);
  console.log(`[Server] Created lobby ${lobby.id}`);

  return lobby;
};
