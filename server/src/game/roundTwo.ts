// ROUND TWO
// Only players who survived round one (not eliminated, with lives left) play.
// - The first player in order gets the first question
// - Correct answer -> that player chooses who answers next (types their number in chat)
// - Wrong answer / timeout by a chosen player -> the player who chose them chooses again
// - Wrong answer / timeout by a player nobody chose (the round's first question, or
//   the ones after it) -> the next player in order is asked, until someone answers
//   correctly and starts choosing
// - Losing the last life eliminates the player
// The round ends when only a few players are left (see finalistCount).

import type * as Shared from "@enavti/shared-types";
import { CHOOSE_PLAYER_DURATION } from "../config";
import { announce, broadcastChat, emitLobbyUpdate } from "../emit";
import { prepareRoundTwoQuestions } from "../questionBank";
import { wait } from "../utils";
import { askQuestion, isActive, judgeAnswer, punishTimeout } from "./questions";

// Lobby id -> the timer that picks a random player if the chooser takes too long
const choiceTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

//CONFIGURABLE No. OF PLAYERS TO END
const finalistCount = (lobby: Shared.Lobby) =>
  (lobby.startingPlayerCount ?? lobby.players.length) < 5 ? 2 : 3;

const activePlayers = (lobby: Shared.Lobby) => lobby.players.filter(isActive);

const isRoundOver = (lobby: Shared.Lobby) =>
  activePlayers(lobby).length <= finalistCount(lobby);

export const startRoundTwo = async (lobby: Shared.Lobby) => {
  console.log("[Server] Starting Round Two");

  lobby.gameState = "roundTwo";
  lobby.roundTwoQuestions = prepareRoundTwoQuestions();
  lobby.currentQuestionIndex = 0;
  delete lobby.roundTwoState;

  announce(lobby.id, {
    type: "info",
    message: "Druga runda!",
    duration: 3000,
  });

  emitLobbyUpdate(lobby);

  await wait(4000);

  if (isRoundOver(lobby)) {
    endRoundTwo(lobby);
    return;
  }

  if (lobby.roundTwoQuestions.length === 0) {
    console.log("[Server] No questions available for Round Two");
    return;
  }

  const firstPlayer = activePlayers(lobby)[0];
  lobby.roundTwoState = {
    currentPlayerId: firstPlayer.id,
    waitingForPlayerChoice: false,
  };

  askRoundTwoQuestion(lobby, firstPlayer);
};

// The target player sent a chat message while their question was active
export const handleRoundTwoAnswer = async (
  lobby: Shared.Lobby,
  player: Shared.Player,
  message: string
) => {
  const { correct, announcementDuration } = await judgeAnswer(
    lobby,
    player,
    message
  );

  await wait(announcementDuration + 1000);
  if (lobby.gameState !== "roundTwo") return;

  if (!correct) {
    handleRoundTwoMiss(lobby);
    return;
  }

  askToChoosePlayer(lobby, player);
};

// The chooser sent a chat message - should be the number of a player still in the game
export const handleRoundTwoChoice = async (
  lobby: Shared.Lobby,
  player: Shared.Player,
  message: string
) => {
  const choiceNumber = parseInt(message.trim());
  const chosen = lobby.players[choiceNumber - 1];

  if (!chosen || chosen.id === player.id || !isActive(chosen)) {
    // Only the chooser sees this
    announce(player.id, {
      type: "info",
      message: `Wybierz numer innego gracza w grze: ${choosableNumbers(
        lobby,
        player
      ).join(", ")}`,
      duration: 3000,
    });
    return;
  }

  broadcastChat(lobby.id, player, message);
  choosePlayer(lobby, chosen);
};

// Stops waiting for a choice (used when the round/game is cut short)
export const cancelPlayerChoice = (lobby: Shared.Lobby) => {
  clearTimeout(choiceTimeouts.get(lobby.id));
  choiceTimeouts.delete(lobby.id);
  if (lobby.roundTwoState) {
    lobby.roundTwoState.waitingForPlayerChoice = false;
    lobby.roundTwoState.currentChooser = undefined;
  }
};

const handleRoundTwoTimeout = async (
  lobby: Shared.Lobby,
  player: Shared.Player
) => {
  if (!(await punishTimeout(lobby, player))) return;
  if (lobby.gameState !== "roundTwo") return;

  handleRoundTwoMiss(lobby);
};

// After a wrong answer or timeout: whoever chose this player chooses again.
// If nobody chose them (or the chooser is gone), the next player in order is asked.
const handleRoundTwoMiss = (lobby: Shared.Lobby) => {
  const chosenBy = lobby.roundTwoState?.chosenBy;
  const chooser = lobby.players.find((p) => p.id === chosenBy && isActive(p));

  if (!chooser) {
    continueRoundTwo(lobby);
    return;
  }

  console.log(`[Server] ${chooser.name} gets to choose again`);
  askToChoosePlayer(lobby, chooser);
};

// 1-based stage numbers of everyone the chooser is allowed to pick
const choosableNumbers = (lobby: Shared.Lobby, chooser: Shared.Player) =>
  lobby.players
    .map((p, index) => ({ p, number: index + 1 }))
    .filter(({ p }) => p.id !== chooser.id && isActive(p))
    .map(({ number }) => number);

const askToChoosePlayer = (lobby: Shared.Lobby, chooser: Shared.Player) => {
  if (isRoundOver(lobby)) {
    endRoundTwo(lobby);
    return;
  }

  lobby.roundTwoState = {
    currentPlayerId: chooser.id,
    waitingForPlayerChoice: true,
    currentChooser: chooser.id,
  };

  console.log(`[Server] ${chooser.name} is choosing the next player to answer`);

  announce(lobby.id, {
    type: "info",
    message: `${chooser.name}, wybierz następnego gracza (${choosableNumbers(
      lobby,
      chooser
    ).join(", ")})`,
    duration: CHOOSE_PLAYER_DURATION,
  });

  // Took too long (or left the game): pick someone at random
  clearTimeout(choiceTimeouts.get(lobby.id));
  choiceTimeouts.set(
    lobby.id,
    setTimeout(() => {
      const candidates = activePlayers(lobby).filter((p) => p.id !== chooser.id);
      const randomPick =
        candidates[Math.floor(Math.random() * candidates.length)];
      console.log(`[Server] ${chooser.name} didn't choose in time`);
      if (randomPick) choosePlayer(lobby, randomPick);
    }, CHOOSE_PLAYER_DURATION)
  );
};

const choosePlayer = async (lobby: Shared.Lobby, chosen: Shared.Player) => {
  const state = lobby.roundTwoState;
  // Already chosen (e.g. the random pick fired at the same moment)
  if (!state?.waitingForPlayerChoice) return;

  const chooserId = state.currentChooser;
  cancelPlayerChoice(lobby);
  state.currentPlayerId = chosen.id;
  state.chosenBy = chooserId;

  announce(lobby.id, {
    type: "info",
    message: `${chosen.name} został wybrany!`,
    duration: 2000,
  });

  await wait(3000);
  if (lobby.gameState !== "roundTwo") return;

  askRoundTwoQuestion(lobby, chosen);
};

// Next active player after `playerId` in stage order (wraps around)
const nextPlayerInOrder = (lobby: Shared.Lobby, playerId?: string) => {
  const currentIndex = lobby.players.findIndex((p) => p.id === playerId);

  for (let offset = 1; offset <= lobby.players.length; offset++) {
    const player =
      lobby.players[(currentIndex + offset) % lobby.players.length];
    if (isActive(player)) return player;
  }

  return undefined;
};

// Nobody chose the player who missed: the next player in order gets a question
const continueRoundTwo = async (lobby: Shared.Lobby) => {
  if (isRoundOver(lobby)) {
    endRoundTwo(lobby);
    return;
  }

  const nextPlayer = nextPlayerInOrder(
    lobby,
    lobby.roundTwoState?.currentPlayerId
  );
  if (!nextPlayer) return;

  lobby.roundTwoState = {
    currentPlayerId: nextPlayer.id,
    waitingForPlayerChoice: false,
  };

  await wait(1000);
  askRoundTwoQuestion(lobby, nextPlayer);
};

const endRoundTwo = (lobby: Shared.Lobby) => {
  console.log("[Server] Round Two completed!");

  cancelPlayerChoice(lobby);

  announce(lobby.id, {
    type: "info",
    message: "Koniec rundy drugiej",
    duration: 3000,
  });

  lobby.gameState = "ended";
  emitLobbyUpdate(lobby);
};

const askRoundTwoQuestion = async (
  lobby: Shared.Lobby,
  targetPlayer: Shared.Player
) => {
  if (!lobby.roundTwoQuestions || lobby.roundTwoQuestions.length === 0) {
    console.log("[Server] No more questions for Round Two");
    return;
  }

  // The pool is already shuffled, go through it in order (wraps if it runs out)
  const questionIndex = lobby.currentQuestionIndex ?? 0;
  const question =
    lobby.roundTwoQuestions[questionIndex % lobby.roundTwoQuestions.length];
  lobby.currentQuestionIndex = questionIndex + 1;

  console.log(`[Server] Round Two: Asking question to ${targetPlayer.name}`);

  await askQuestion(lobby, question, targetPlayer, () =>
    handleRoundTwoTimeout(lobby, targetPlayer)
  );
};
