// chat-message-req
// Chat is also how players play: answers and round two player choices
// are just chat messages. This decides which one a message is.

import type { Socket } from "socket.io";
import { broadcastChat } from "../emit";
import { lobbies } from "../lobbies";
import { handleRoundOneAnswer } from "../game/roundOne";
import { handleRoundTwoAnswer, handleRoundTwoChoice } from "../game/roundTwo";

export const registerChatHandlers = (socket: Socket) => {
  socket.on("chat-message-req", async ({ lobbyId, message }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    const player = lobby.players.find((p) => p.id === socket.id);
    if (!player) return;

    const isAnsweringPlayer = lobby.activeQuestion?.targetPlayer === socket.id;
    const isChoosingPlayer =
      lobby.roundTwoState?.waitingForPlayerChoice &&
      lobby.roundTwoState.currentChooser === socket.id;

    if (lobby.gameState === "roundOne" && isAnsweringPlayer) {
      return handleRoundOneAnswer(lobby, player, message);
    }

    if (lobby.gameState === "roundTwo" && isAnsweringPlayer) {
      return handleRoundTwoAnswer(lobby, player, message);
    }

    if (lobby.gameState === "roundTwo" && isChoosingPlayer) {
      return handleRoundTwoChoice(lobby, player, message);
    }

    // Regular chat message
    broadcastChat(lobbyId, player, message);
    console.log(`[Server] ${player.name}: ${message}`);
  });
};
