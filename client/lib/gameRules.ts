import type * as Shared from "@enavti/shared-types";

// Keep in sync with server/src/config.ts
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

const ROUNDS: Shared.GameState[] = ["roundOne", "roundTwo", "roundThree"];

// While a round is on, the spectators' chat is toned down (dimmed and silent)
// for the players still in the game, so it doesn't distract them
export const isMutedChat = (
  players: Shared.Player[],
  gameState: Shared.GameState,
  authorId: string,
  viewerId?: string,
) =>
  ROUNDS.includes(gameState) &&
  !!players.find((p) => p.id === authorId)?.eliminated &&
  !players.find((p) => p.id === viewerId)?.eliminated;
