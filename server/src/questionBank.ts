// Loads questions from questions.json (re-read every time, so edits apply without a restart)

import type * as Shared from "@enavti/shared-types";
import { join } from "path";
import { readFileSync } from "fs";
import { ROUND_ONE_QUESTIONS_PER_PLAYER } from "./config";
import { shuffleArray } from "./utils";

type QuestionsFile = {
  round1: Shared.Question[];
  round2?: Shared.Question[];
};

const loadQuestions = (): QuestionsFile => {
  const questionsPath = join(__dirname, "..", "questions.json");
  return JSON.parse(readFileSync(questionsPath, "utf-8"));
};

export const prepareRoundOneQuestions = (playerCount: number) => {
  const questionsNeeded = playerCount * ROUND_ONE_QUESTIONS_PER_PLAYER;
  return shuffleArray(loadQuestions().round1).slice(0, questionsNeeded);
};

// Falls back to round one questions if there's no round2 section
export const prepareRoundTwoQuestions = () => {
  const questions = loadQuestions();
  return shuffleArray(questions.round2 || questions.round1);
};
