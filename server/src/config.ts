// All tweakable numbers in one place.

export const PORT = process.env.SERVER_PORT || 3001;

// Debug socket events (debug panel) are disabled in production
export const DEBUG_ENABLED = process.env.NODE_ENV !== "production";

// The host can't start the game with fewer players (keep in sync with client/lib/gameRules.ts)
export const MIN_PLAYERS = 3;

// Most players a lobby is filled to (used by the debug bots, and the client's
// stage has seats for this many - keep in sync with client/lib/gameRules.ts)
export const MAX_PLAYERS = 10;

// Lives every player starts the game with
export const STARTING_LIVES = 3;

// How many round one questions each player gets.
// Missing all of them = eliminated before round two.
export const ROUND_ONE_QUESTIONS_PER_PLAYER = 2;

// How long the round one summary (players + lives) stays on screen
export const ROUND_ONE_SUMMARY_DURATION = 6000;

// How long the "host" waits before reacting to an answer, like on TV
export const HOST_REACTION_DELAY = 800;

// Answer timer: total time and how often clients get a timer-update
export const ANSWER_TIME = 3000;
export const TIMER_TICK_INTERVAL = 100;

// Question announcement length = words * WORD_READ_TIME + QUESTION_BASE_TIME
export const WORD_READ_TIME = 500;
export const QUESTION_BASE_TIME = 1000;

// Announcement durations
export const RIGHT_ANSWER_DURATION = 2000;
export const WRONG_ANSWER_DURATION = 3000;

// Round two: time to pick the next player before one is picked at random
export const CHOOSE_PLAYER_DURATION = 15000;
