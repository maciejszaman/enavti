// The countdown a player gets to answer a question.
// Sends a timer-update every tick and calls onExpire when time runs out.

import type * as Shared from "@enavti/shared-types";
import { io } from "../io";
import { ANSWER_TIME, TIMER_TICK_INTERVAL } from "../config";

export const startAnswerTimer = (
  lobby: Shared.Lobby,
  targetPlayer: Shared.Player,
  onExpire: () => void
) => {
  let timeRemaining = ANSWER_TIME;

  stopAnswerTimer(lobby);

  const timerInterval = setInterval(() => {
    timeRemaining -= TIMER_TICK_INTERVAL;

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      onExpire();
      return;
    }

    io.to(lobby.id).emit("timer-update", {
      timeRemaining,
      totalTime: ANSWER_TIME,
      targetPlayer: targetPlayer.id,
    } as Shared.TimerUpdate);
  }, TIMER_TICK_INTERVAL);

  if (lobby.activeQuestion) {
    lobby.activeQuestion.timeoutId = timerInterval;
  }
};

export const stopAnswerTimer = (lobby: Shared.Lobby) => {
  if (lobby.activeQuestion?.timeoutId) {
    clearInterval(lobby.activeQuestion.timeoutId);
    lobby.activeQuestion.timeoutId = undefined;
  }
};
