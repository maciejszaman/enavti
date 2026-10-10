// Shared question flow used by every round:
//   askQuestion   -> announce the question, then start the answer timer
//   judgeAnswer   -> the target player answered (right or wrong)
//   punishTimeout -> the target player ran out of time
// What happens *after* (next question, choosing a player...) is up to each round.

import type * as Shared from "@enavti/shared-types";
import {
  HOST_REACTION_DELAY,
  QUESTION_BASE_TIME,
  RIGHT_ANSWER_DURATION,
  WORD_READ_TIME,
  WRONG_ANSWER_DURATION,
} from "../config";
import {
  announce,
  broadcastChat,
  emitLobbyUpdate,
  resetTimerDisplay,
} from "../emit";
import { wait } from "../utils";
import { startAnswerTimer, stopAnswerTimer } from "./timer";

const readingTime = (text: string) =>
  text.split(" ").length * WORD_READ_TIME + QUESTION_BASE_TIME;

// Still playing: not eliminated and has lives left
export const isActive = (player: Shared.Player) =>
  !player.eliminated && (player.lives ?? 0) > 0;

// Returns true if the player had a life to lose. Losing the last one eliminates them.
const loseLife = (player: Shared.Player) => {
  if (player.lives === undefined || player.lives <= 0) return false;
  player.lives -= 1;
  if (player.lives === 0) player.eliminated = true;
  return true;
};

export const askQuestion = async (
  lobby: Shared.Lobby,
  question: Shared.Question,
  targetPlayer: Shared.Player,
  onTimeout: () => void
) => {
  lobby.activeQuestion = {
    questionId: question.id,
    text: question.question,
    answer: question.answer,
    targetPlayer: targetPlayer.id,
    askedAt: new Date(),
  };
  console.log(`[Server] ${question.question}`);
  console.log(`[Server] ${question.answer}`);

  const duration = readingTime(question.question);

  announce(lobby.id, {
    type: "question",
    message: question.question,
    targetPlayer: targetPlayer.id,
    duration,
  });

  await wait(duration);

  // The player may have answered while the question was still being read
  if (
    !lobby.activeQuestion ||
    lobby.activeQuestion.questionId !== question.id
  ) {
    console.log(
      `[Server] Question was already answered during announcement, skipping timer`
    );
    return;
  }

  startAnswerTimer(lobby, targetPlayer, onTimeout);
};

// Call only when lobby.activeQuestion exists and `player` is its target.
// Returns whether the answer was correct and how long the reaction announcement lasts.
export const judgeAnswer = async (
  lobby: Shared.Lobby,
  player: Shared.Player,
  message: string
) => {
  const correctAnswer = lobby.activeQuestion!.answer.trim().toLowerCase();
  const userAnswer = message.trim().toLowerCase();

  stopAnswerTimer(lobby);
  resetTimerDisplay(lobby.id);
  broadcastChat(lobby.id, player, message);

  // Close the question now, so another message isn't judged during the pause
  delete lobby.activeQuestion;

  await wait(HOST_REACTION_DELAY);

  const correct = userAnswer.includes(correctAnswer);
  let announcementDuration = 0;

  if (correct) {
    console.log(`[Server] ${player.name} answered correctly`);
    announcementDuration = RIGHT_ANSWER_DURATION;
    announce(lobby.id, {
      type: "right-answer",
      message: "Dobrze.",
      duration: announcementDuration,
    });

    if (player.score !== undefined) {
      player.score += 1;
    }
  } else {
    console.log(`[Server] ${player.name} answered incorrectly`);

    if (loseLife(player)) {
      announcementDuration = WRONG_ANSWER_DURATION;
      announce(lobby.id, {
        type: "wrong-answer",
        message: `Nie, to "${correctAnswer}"`,
        duration: announcementDuration,
      });
      console.log(`[Server] ${player.name} lost a life. Lives: ${player.lives}`);
    }
  }

  emitLobbyUpdate(lobby);

  return { correct, announcementDuration };
};

// Takes a life, shows the correct answer and waits for the announcement.
// Returns false if there was no active question (nothing happened).
export const punishTimeout = async (
  lobby: Shared.Lobby,
  player: Shared.Player
) => {
  if (!lobby.activeQuestion) return false;

  console.log(`[Server] ${player.name} ran out of time`);

  resetTimerDisplay(lobby.id);

  if (loseLife(player)) {
    announce(lobby.id, {
      type: "wrong-answer",
      message: `To "${lobby.activeQuestion.answer}"`,
      duration: WRONG_ANSWER_DURATION,
    });
    console.log(`[Server] ${player.name} lost a life.`);
  }

  emitLobbyUpdate(lobby);

  delete lobby.activeQuestion;

  await wait(WRONG_ANSWER_DURATION + 1000);

  return true;
};
