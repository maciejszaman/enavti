// TEMPORARY DEBUG BOTS - fill a lobby with fake players for testing.
// Each bot is a real socket.io client connected to this server, so it joins,
// chats and disconnects exactly like a browser would. Bots cheat by reading the
// answer straight from the lobby, then get it right BOT_ACCURACY of the time.

import { io as connect, type Socket } from "socket.io-client";
import type * as Shared from "@enavti/shared-types";
import { MAX_PLAYERS, PORT } from "./config";
import { lobbies } from "./lobbies";
import { isActive } from "./game/questions";

const BOT_ACCURACY = 0.5;

// Lobby id -> its bots
const botsByLobby = new Map<string, Socket[]>();

const randomBetween = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));

const say = (bot: Socket, lobbyId: string, message: string) =>
  bot.emit("chat-message-req", { lobbyId, playerId: bot.id, message });

const isBotId = (lobbyId: string, id: string) =>
  botsByLobby.get(lobbyId)?.some((bot) => bot.id === id) ?? false;

const answerQuestion = (bot: Socket, lobbyId: string) => {
  const question = lobbies.get(lobbyId)?.activeQuestion;
  if (!question || question.targetPlayer !== bot.id) return;

  const correct = Math.random() < BOT_ACCURACY;
  say(bot, lobbyId, correct ? question.answer : "i dont know");
};

// Round two: pick a random player still in the game (by stage number)
const choosePlayer = (bot: Socket, lobbyId: string) => {
  const lobby = lobbies.get(lobbyId);
  const state = lobby?.roundTwoState;
  if (!lobby || !state?.waitingForPlayerChoice) return;
  if (state.currentChooser !== bot.id) return;

  const numbers = lobby.players
    .map((p, index) => ({ p, number: index + 1 }))
    .filter(({ p }) => p.id !== bot.id && isActive(p))
    .map(({ number }) => number);
  if (numbers.length === 0) return;

  say(bot, lobbyId, String(numbers[randomBetween(0, numbers.length - 1)]));
};

const createBot = (lobbyId: string) => {
  const bot = connect(`http://localhost:${PORT}`, {
    transports: ["websocket"],
  });

  bot.on("connect", () => {
    bot.emit("join-lobby", {
      lobbyId,
      playerName: String(randomBetween(1000, 9999)),
      character: {
        character: randomBetween(1, 4),
        clothesColor: randomBetween(1, 4),
      },
    });
  });

  bot.on("announcement", (announcement: Shared.Announcement) => {
    if (announcement.type === "question" && announcement.targetPlayer === bot.id) {
      setTimeout(() => answerQuestion(bot, lobbyId), randomBetween(1500, 3500));
    }
    // A choice is announced right after this bot's correct answer
    setTimeout(() => choosePlayer(bot, lobbyId), randomBetween(1500, 3000));
  });

  // Nobody real left in the lobby: leave too, so the lobby gets deleted
  bot.on("lobby-update", ({ players }: { players: Shared.Player[] }) => {
    if (players.every((p) => isBotId(lobbyId, p.id))) removeBots(lobbyId);
  });

  return bot;
};

const addBots = (lobbyId: string, count: number) => {
  const bots = botsByLobby.get(lobbyId) ?? [];
  for (let i = 0; i < count; i++) bots.push(createBot(lobbyId));
  botsByLobby.set(lobbyId, bots);

  console.log(`[Debug] Added ${count} bots to lobby ${lobbyId}`);
};

// Adds bots until the lobby has MAX_PLAYERS. Only before the game starts.
export const fillWithBots = (lobby: Shared.Lobby) => {
  if (lobby.gameState !== "lobby") return;

  const missing = MAX_PLAYERS - lobby.players.length;
  if (missing > 0) addBots(lobby.id, missing);
};

// Adds a single bot, up to MAX_PLAYERS. Mid-game it joins as a spectator.
export const addBot = (lobby: Shared.Lobby) => {
  if (lobby.players.length < MAX_PLAYERS) addBots(lobby.id, 1);
};

// Removes the most recently added bot
export const removeBot = (lobbyId: string) => {
  botsByLobby.get(lobbyId)?.pop()?.disconnect();
};

export const removeBots = (lobbyId: string) => {
  botsByLobby.get(lobbyId)?.forEach((bot) => bot.disconnect());
  botsByLobby.delete(lobbyId);
};
