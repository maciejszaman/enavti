// ROUND ONE
// Players are asked in turn order, going around ROUND_ONE_QUESTIONS_PER_PLAYER times
// (with 2: 1, 2, 3, 1, 2, 3). Wrong answer or timeout = lose a life.
// Anyone who missed all of their questions is eliminated and only spectates round two.
// After the last question a summary with everyone's lives is shown, then round two starts.

import type * as Shared from "@enavti/shared-types";
import {
  ROUND_ONE_QUESTIONS_PER_PLAYER,
  ROUND_ONE_SUMMARY_DURATION,
} from "../config";
import { announce, emitLobbyUpdate, resetTimerDisplay } from "../emit";
import { prepareRoundOneQuestions } from "../questionBank";
import { wait } from "../utils";
import { askQuestion, judgeAnswer, punishTimeout } from "./questions";
import { startRoundTwo } from "./roundTwo";

export const startRoundOne = async (lobby: Shared.Lobby) => {
  const participants = lobby.players.filter((p) => !p.eliminated);

  lobby.roundOneTurns = [];
  for (let i = 0; i < ROUND_ONE_QUESTIONS_PER_PLAYER; i++) {
    participants.forEach((p) => lobby.roundOneTurns!.push(p.id));
  }
  lobby.roundOneQuestions = prepareRoundOneQuestions(participants.length);
  lobby.roundOneMisses = {};
  lobby.currentQuestionIndex = 0;

  await wait(2000);

  console.log(
    "[Server] Starting Round One with questions:",
    lobby.roundOneQuestions
  );

  if (lobby.roundOneQuestions.length < lobby.roundOneTurns.length) {
    console.log("[Server] Not enough questions available for Round One");
    return;
  }

  askRoundOneQuestion(lobby);
};

const addMiss = (lobby: Shared.Lobby, player: Shared.Player) => {
  lobby.roundOneMisses ??= {};
  lobby.roundOneMisses[player.id] = (lobby.roundOneMisses[player.id] ?? 0) + 1;
};

// The target player sent a chat message while their question was active
export const handleRoundOneAnswer = async (
  lobby: Shared.Lobby,
  player: Shared.Player,
  message: string
) => {
  const { correct, announcementDuration } = await judgeAnswer(
    lobby,
    player,
    message
  );
  if (!correct) addMiss(lobby, player);

  await wait(announcementDuration + 1000);
  if (lobby.gameState !== "roundOne") return;

  continueRoundOne(lobby);
};

const handleRoundOneTimeout = async (
  lobby: Shared.Lobby,
  player: Shared.Player
) => {
  if (!(await punishTimeout(lobby, player))) return;
  addMiss(lobby, player);
  if (lobby.gameState !== "roundOne") return;

  continueRoundOne(lobby);
};

const askRoundOneQuestion = async (lobby: Shared.Lobby) => {
  const index = lobby.currentQuestionIndex;
  if (!lobby.roundOneQuestions || !lobby.roundOneTurns || index === undefined) {
    return;
  }

  const question = lobby.roundOneQuestions[index];
  const targetPlayer = lobby.players.find(
    (p) => p.id === lobby.roundOneTurns![index]
  );

  // The player left the game, skip their turn
  if (!targetPlayer) {
    continueRoundOne(lobby);
    return;
  }

  console.log(
    `[Server] Asking question ${index + 1}/${lobby.roundOneTurns.length} to ${
      targetPlayer.name
    }`
  );

  await askQuestion(lobby, question, targetPlayer, () =>
    handleRoundOneTimeout(lobby, targetPlayer)
  );
};

// Next question, or the summary + round two if every turn was played
const continueRoundOne = async (lobby: Shared.Lobby) => {
  lobby.currentQuestionIndex = (lobby.currentQuestionIndex ?? 0) + 1;

  resetTimerDisplay(lobby.id);

  const finished =
    !lobby.roundOneTurns ||
    lobby.currentQuestionIndex >= lobby.roundOneTurns.length;

  if (!finished) {
    await askRoundOneQuestion(lobby);
    return;
  }

  console.log("[Server] Round One completed!");
  const completionDuration = 2000;

  announce(lobby.id, {
    type: "info",
    message: "Round One completed!",
    duration: completionDuration,
  });

  await wait(completionDuration + 1000);

  eliminateRoundOneFailures(lobby);
  await showRoundOneSummary(lobby);

  startRoundTwo(lobby);
};

// Everyone who missed all of their round one questions is out
const eliminateRoundOneFailures = (lobby: Shared.Lobby) => {
  lobby.players.forEach((player) => {
    const misses = lobby.roundOneMisses?.[player.id] ?? 0;
    if (!player.eliminated && misses >= ROUND_ONE_QUESTIONS_PER_PLAYER) {
      player.eliminated = true;
      console.log(`[Server] ${player.name} is eliminated after Round One`);
    }
  });

  emitLobbyUpdate(lobby);
};

const showRoundOneSummary = async (lobby: Shared.Lobby) => {
  announce(lobby.id, {
    type: "modal",
    message: "roundOneSummary",
    duration: ROUND_ONE_SUMMARY_DURATION,
  });

  await wait(ROUND_ONE_SUMMARY_DURATION);

  announce(lobby.id, {
    type: "closeModal",
    message: "",
    duration: 1000,
  });

  await wait(1000);
};
