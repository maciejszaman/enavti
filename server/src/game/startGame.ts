// Intro sequence after the host clicks "Start": reset players, shuffle the order, then round one.

import type * as Shared from "@enavti/shared-types";
import { MIN_PLAYERS, STARTING_LIVES } from "../config";
import { announce, emitLobbyUpdate } from "../emit";
import { shuffleArray, wait } from "../utils";
import { startRoundOne } from "./roundOne";

export const canStartGame = (lobby: Shared.Lobby) =>
  lobby.gameState === "lobby" && lobby.players.length >= MIN_PLAYERS;

export const startGame = async (lobby: Shared.Lobby) => {
  if (!canStartGame(lobby)) return;

  lobby.gameState = "roundOne";
  lobby.startingPlayerCount = lobby.players.length;

  lobby.players.forEach((player) => {
    player.lives = STARTING_LIVES;
    player.score = 0;
    player.eliminated = false;
  });

  announce(lobby.id, {
    type: "game-start",
    message: "Game starting...",
    duration: 3000,
  });

  await wait(4000);
  console.log(`[Server] Game started in lobby ${lobby.id}`);

  announce(lobby.id, {
    type: "modal",
    message: "shufflingPlayers",
    duration: 2000,
  });
  console.log("[Server] Opened modal");

  await wait(1000);

  lobby.players = shuffleArray(lobby.players);
  console.log("[Server] Shuffled the players' order");

  emitLobbyUpdate(lobby);
  console.log("[Server] Sent lobby-update");

  // Give the client time to animate the shuffle
  await wait(lobby.players.length * 1000 + 3000);

  announce(lobby.id, {
    type: "closeModal",
    message: "",
    duration: 1000,
  });

  startRoundOne(lobby);
};
