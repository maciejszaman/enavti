# Server Documentation

## Overview

This is the Socket.IO game server for enavti, a multiplayer quiz game. Players join lobbies, answer questions in the chat, and compete in real time.

```bash
bun run dev     # watch mode, http://localhost:3001 (override with SERVER_PORT)
bun run start   # no watch
bun run build   # typecheck only
```

All state lives in memory (a `Map` of lobbies), so everything is lost when the server restarts.

---

## Where Everything Is

```
server/
├── server.ts                 # Entry point: registers routes + sockets, starts listening
├── questions.json            # Question bank ({ round1: [...], round2?: [...] })
└── src/
    ├── config.ts             # All tweakable numbers (timers, lives, durations, port)
    ├── io.ts                 # Express app, HTTP server, Socket.IO instance
    ├── lobbies.ts            # In-memory lobby Map + createLobby()
    ├── questionBank.ts       # Reads questions.json, picks/shuffles questions per round
    ├── emit.ts               # Helpers for common emits (lobby-update, announcement, chat, timer reset)
    ├── utils.ts              # wait(), shuffleArray()
    │
    ├── http/
    │   └── routes.ts         # REST endpoints
    │
    ├── sockets/              # Socket event handlers: thin, they validate then call into game/
    │   ├── index.ts          # Registers every handler on each new connection
    │   ├── lobbyHandlers.ts  # lobby-update-req, join-lobby, disconnect
    │   ├── chatHandlers.ts   # chat-message-req: decides if a message is chat, an answer or a choice
    │   ├── gameHandlers.ts   # start-game
    │   └── debugHandlers.ts  # debug-state-req, debug-action (dev only)
    │
    └── game/                 # The actual game logic
        ├── startGame.ts      # Intro: reset lives, shuffle players, start round one
        ├── questions.ts      # Shared per-question flow: askQuestion, judgeAnswer, punishTimeout
        ├── timer.ts          # The answer countdown (startAnswerTimer, stopAnswerTimer)
        ├── roundOne.ts       # Round one rules
        └── roundTwo.ts       # Round two rules
```

### Rules of thumb

- **Changing a number** (time to answer, lives, how long announcements show) → `src/config.ts`
- **New socket event** → add it to the matching file in `src/sockets/` (or a new file registered in `sockets/index.ts`). Keep the handler small: look up the lobby/player, then call a function from `src/game/`.
- **Changing what happens in a round** → `src/game/roundOne.ts` / `roundTwo.ts`
- **Changing how any question is asked/judged** (for every round) → `src/game/questions.ts`
- **Emitting to clients from game code** → use the helpers in `src/emit.ts`, or `io` from `src/io.ts`
- **New round** → create `src/game/roundThree.ts` following the same shape as round two (`startRoundThree`, `handleRoundThreeAnswer`, a timeout handler passed to `askQuestion`), call it at the end of round two, and route answers to it in `sockets/chatHandlers.ts`.

### Import direction

Dependencies only go one way, so there are no circular imports:

```
server.ts → sockets/ → game/ → emit.ts, questionBank.ts, lobbies.ts, io.ts, config.ts, utils.ts
                       startGame → roundOne → roundTwo
                       roundOne, roundTwo → questions → timer
```

`timer.ts` and `questions.ts` know nothing about rounds. Each round passes its own `onTimeout` callback to `askQuestion`, and that callback decides what happens next.

---

## Game Flow

### Start (`game/startGame.ts`)

Only the host (first player in `lobby.players`) can start, and only with at least `MIN_PLAYERS` (3) players. Anyone who joins after the start is added as a spectator (`eliminated: true`).

1. `gameState = "roundOne"`, every player gets `STARTING_LIVES` lives and a score of 0
2. "Game starting..." announcement
3. Shuffle modal, player order is shuffled, `lobby-update` sent
4. Modal closes, then `startRoundOne()`

### Asking a question (`game/questions.ts`)

Every round uses the same flow:

```
askQuestion()
    ↓
set lobby.activeQuestion, emit "question" announcement
    ↓
wait for the reading time (words × WORD_READ_TIME + QUESTION_BASE_TIME)
    ↓
question still active? ── no (answered during the announcement) → stop
    ↓ yes
startAnswerTimer()  →  timer-update every TIMER_TICK_INTERVAL
    ↓
player answers in chat                   timer runs out
    ↓                                        ↓
judgeAnswer()                            punishTimeout()
 - stop timer, show the chat message      - lose a life
 - close the question                     - show the correct answer
 - wait HOST_REACTION_DELAY               - close the question
 - right: +1 score / wrong: -1 life
    ↓                                        ↓
the round decides what's next (next question, choose a player, ...)
```

The question is closed (`delete lobby.activeQuestion`) **before** any waiting, so a second message from the same player is treated as normal chat and the pending timer never starts.

### Round one (`game/roundOne.ts`)

- `ROUND_ONE_QUESTIONS_PER_PLAYER` questions per player, asked in turn order going around (1, 2, 3, 1, 2, 3). The order is fixed at the start in `lobby.roundOneTurns` (player ids), so someone leaving doesn't shift it; their turns are skipped.
- Wrong answer or timeout costs a life and counts as a miss (`lobby.roundOneMisses`)
- After the last question: "Round One completed!", then everyone who missed all of their questions gets `eliminated = true` (they stay in the lobby as spectators)
- The `roundOneSummary` modal shows every player and their lives for `ROUND_ONE_SUMMARY_DURATION`, then `startRoundTwo()`

### Round two (`game/roundTwo.ts`)

- Only active players play (`isActive`: not eliminated and lives > 0). Losing the last life sets `eliminated = true`.
- Questions come from the shuffled round two pool in order (falls back to `round1` if `questions.json` has no `round2`)
- The first active player in order gets the first question
- **Right answer:** that player becomes the chooser and types the stage number of another active player in chat (`handleRoundTwoChoice`). Invalid picks (themselves, eliminated players) are rejected privately. If they don't pick within `CHOOSE_PLAYER_DURATION`, a random active player is picked.
- **Wrong answer / timeout by a chosen player:** the player who chose them chooses again (`roundTwoState.chosenBy`)
- **Wrong answer / timeout by a player nobody chose** (the round's first question, and the ones after it): the next active player in order is asked, until someone answers correctly and starts choosing
- The round ends when only 2 players (fewer than 5 started the game) or 3 players (5 or more) are still active → `gameState = "ended"`. This is also checked when the round starts, so it can end right away if round one eliminated enough players.

State for this lives in `lobby.roundTwoState`:

| Field                    | Meaning                                                 |
| ------------------------ | ------------------------------------------------------- |
| `currentPlayerId`        | Who is/was answering (or choosing)                      |
| `waitingForPlayerChoice` | True while a chooser has to pick                        |
| `currentChooser`         | Socket ID of the player who is picking right now        |
| `chosenBy`               | Who chose the current player (chooses again if they miss) |

### How a chat message is routed (`sockets/chatHandlers.ts`)

| Condition                                                    | Goes to                  |
| ------------------------------------------------------------ | ------------------------ |
| Round one, sender is the target of the active question       | `handleRoundOneAnswer`   |
| Round two, sender is the target of the active question       | `handleRoundTwoAnswer`   |
| Round two, sender is the player who has to choose            | `handleRoundTwoChoice`   |
| Anything else                                                | Normal chat broadcast    |

---

## REST Endpoints (`src/http/routes.ts`)

| Method | Path                  | Returns                                          |
| ------ | --------------------- | ------------------------------------------------ |
| GET    | `/health`             | `OK`                                             |
| GET    | `/lobbies`            | All active lobbies                               |
| GET    | `/api/lobby/:lobbyId` | `{ exists: true, lobby }` or 404 `{ exists: false }` |
| POST   | `/createLobby`        | `{ lobbyId, message }`                           |

---

## Socket Events

### Server listens (from clients)

| Event              | Data                                 | Handler file        |
| ------------------ | ------------------------------------ | ------------------- |
| `lobby-update-req` | `{ lobbyId }`                        | `lobbyHandlers.ts`  |
| `join-lobby`       | `{ lobbyId, playerName, character }` | `lobbyHandlers.ts`  |
| `disconnect`       | (built-in)                           | `lobbyHandlers.ts`  |
| `chat-message-req` | `{ lobbyId, playerId, message }`     | `chatHandlers.ts`   |
| `start-game`       | `{ lobbyId }`                        | `gameHandlers.ts`   |
| `debug-state-req`  | `{ lobbyId }`, callback              | `debugHandlers.ts`  |
| `debug-action`     | `{ lobbyId, action }`                | `debugHandlers.ts`  |

Debug events are only registered when `NODE_ENV !== "production"`. Actions: `reset-lives`, `skip-to-round-two`, `end-game`, `fill-bots` (adds bots up to `MAX_PLAYERS`, lobby only; see `src/debugBots.ts`), `remove-bots`.

### Server emits (to clients)

| Event                    | Data                                           | When                                   |
| ------------------------ | ---------------------------------------------- | -------------------------------------- |
| `lobby-update`           | `{ players, gameState }`                       | Players join/leave, lives/score/state change |
| `announcement`           | `Announcement`                                 | Questions, results, game events        |
| `timer-update`           | `TimerUpdate`                                  | Every tick during the countdown        |
| `timer-stop`             | none                                           | Answer submitted, timeout, next question |
| `chat-message-broadcast` | `ChatMessage`                                  | Chat messages and answers              |
| `error`                  | `{ message }`                                  | Lobby not found                        |

---

## Data Structures

All types are in `packages/sharedTypes/src/index.ts` and shared between the client and the server. The most important ones:

- **`Lobby`**: `id`, `players`, `gameState` (`"lobby" | "roundOne" | "roundTwo" | "roundThree" | "ended"`), plus game state:
  - `activeQuestion`: the question waiting for an answer (`answer`, `targetPlayer`, `timeoutId` of the running timer). It only exists while an answer is expected.
  - `roundOneQuestions`, `currentQuestionIndex`: round one progress
  - `roundTwoQuestions`, `roundTwoState`: see round two above
- **`Player`**: `id` (socket ID), `name`, `character`, `lives`, `score`, `eliminated` (out of the game, spectating)
- **`Question`**: `id`, `question`, `answer`, optional `category` and `source`
- **`Announcement`**: `type`, `message`, `duration`, optional `targetPlayer`
- **`TimerUpdate`**: `timeRemaining`, `totalTime`, `targetPlayer`

Answers are checked with `userAnswer.includes(correctAnswer)` (both trimmed and lowercased), so extra words around the right answer still count.

---

## Debugging Tips

- Server logs are prefixed with `[Server]` (and `[Debug]` for debug actions). The question text and answer are logged when a question is asked.
- Use the client's debug panel (`debug-state-req`) to see the live lobby state, including the active question and round two state.
- **Timer doesn't start:** the player probably answered during the announcement. That's expected, see `askQuestion` in `game/questions.ts`.
- **Players not seeing updates:** the socket must have joined the room (`socket.join(lobbyId)` in `join-lobby`), and the event must go to `io.to(lobbyId)`, not `socket.emit()`.

---

## Dependencies

- `express`: HTTP server
- `socket.io`: WebSocket communication
- `cors`: cross-origin requests
- `@enavti/shared-types`: shared TypeScript types between the client and the server
