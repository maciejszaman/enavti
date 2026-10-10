// TEMPORARY DEBUG MENU - debug-state-req, debug-action
// Only registered when NODE_ENV !== "production" (see sockets/index.ts)

import type { Socket } from "socket.io";
import { STARTING_LIVES } from "../config";
import { emitLobbyUpdate } from "../emit";
import { io } from "../io";
import { lobbies } from "../lobbies";
import { stopAnswerTimer } from "../game/timer";
import { cancelPlayerChoice, startRoundTwo } from "../game/roundTwo";
import { addBot, fillWithBots, removeBot, removeBots } from "../debugBots";
import type * as Shared from "@enavti/shared-types";

const cancelActiveQuestion = (lobby: Shared.Lobby) => {
  stopAnswerTimer(lobby);
  cancelPlayerChoice(lobby);
  delete lobby.activeQuestion;
  io.to(lobby.id).emit("timer-stop");
};

export const registerDebugHandlers = (socket: Socket) => {
  // Snapshot of the lobby state for the debug panel
  socket.on("debug-state-req", ({ lobbyId }, callback) => {
    const lobby = lobbies.get(lobbyId);
    if (typeof callback !== "function") return;
    if (!lobby) return callback({ error: "Lobby not found" });

    const { timeoutId, ...activeQuestion } = lobby.activeQuestion ?? {};
    const nextRoundOneQuestion =
      lobby.gameState === "roundOne" && lobby.currentQuestionIndex !== undefined
        ? lobby.roundOneQuestions?.[lobby.currentQuestionIndex + 1]
        : undefined;

    callback({
      id: lobby.id,
      gameState: lobby.gameState,
      players: lobby.players,
      activeQuestion: lobby.activeQuestion
        ? { ...activeQuestion, timerRunning: !!timeoutId }
        : null,
      currentQuestionIndex: lobby.currentQuestionIndex,
      roundOneTotal: lobby.roundOneQuestions?.length ?? 0,
      nextRoundOneQuestion: nextRoundOneQuestion ?? null,
      roundTwoState: lobby.roundTwoState ?? null,
      roundTwoPoolSize: lobby.roundTwoQuestions?.length ?? 0,
      serverTime: Date.now(),
    });
  });

  socket.on("debug-action", ({ lobbyId, action }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    console.log(`[Debug] ${action} in lobby ${lobbyId}`);

    switch (action) {
      case "fill-bots":
        fillWithBots(lobby);
        return;
      case "add-bot":
        addBot(lobby);
        return;
      case "remove-bot":
        removeBot(lobby.id);
        return;
      case "remove-bots":
        removeBots(lobby.id);
        return;
      case "reset-lives":
        lobby.players.forEach((player) => {
          player.lives = STARTING_LIVES;
          player.eliminated = false;
        });
        break;
      case "skip-to-round-two":
        cancelActiveQuestion(lobby);
        startRoundTwo(lobby);
        return;
      case "end-game":
        cancelActiveQuestion(lobby);
        lobby.gameState = "ended";
        break;
      default:
        return;
    }

    emitLobbyUpdate(lobby);
  });
};
