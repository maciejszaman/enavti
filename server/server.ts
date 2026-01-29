import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import * as Shared from "@enavti/shared-types";
import { join } from "path";
import { readFileSync } from "fs";

const app = express();
const httpServer = createServer(app);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const lobbies = new Map<string, Shared.Lobby>();

//SHORT RANDOM ID
const generateLobbyId = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

app.get("/health", (req, res) => {
  res.send("OK");
});

app.get("/lobbies", (req, res) => {
  res.json(Array.from(lobbies.values()));
});

app.get("/api/lobby/:lobbyId", (req, res) => {
  const { lobbyId } = req.params;

  const lobbyExists = lobbies.has(lobbyId);

  if (lobbyExists) {
    res.json({ exists: true, lobby: lobbies.get(lobbyId) });
  }

  if (!lobbyExists) {
    return res.status(404).json({ exists: false, message: "Lobby not found" });
  }
});

app.post("/createLobby", (req, res) => {
  const lobbyId = generateLobbyId();
  const lobby: Shared.Lobby = {
    id: lobbyId,
    players: [],
    createdAt: new Date(),
    gameState: "lobby",
  };

  lobbies.set(lobbyId, lobby);

  console.log(`[Server] Created lobby ${lobbyId}`);

  res.json({
    lobbyId,
    message: "Lobby created successfully",
  });
});

io.on("connection", (socket) => {
  console.log(`[Server] Client connected: ${socket.id}`);

  socket.on("lobby-update-req", ({ lobbyId }) => {
    const lobby = lobbies.get(lobbyId);
    if (lobby) {
      console.log(`[Server] Sending lobby update to ${socket.id}`);
      socket.emit("lobby-update", {
        players: lobby.players,
        gameState: lobby.gameState,
      });
    } else {
      socket.emit("error", { message: "Lobby not found" });
    }
  });

  socket.on("join-lobby", ({ lobbyId, playerName, character }) => {
    const lobby = lobbies.get(lobbyId);

    if (!lobby) {
      socket.emit("error", { message: "Lobby not found" });
      return;
    }

    const existingPlayer = lobby.players.find((p) => p.id === socket.id);

    if (!existingPlayer) {
      lobby.players.push({
        id: socket.id,
        name: playerName,
        lives: 3,
        character: {
          character: character.character,
          clothesColor: character.clothesColor,
        },
      });
    } else {
      existingPlayer.name = playerName;
    }

    socket.join(lobbyId);

    console.log(lobby.gameState);

    io.to(lobbyId).emit("lobby-update", {
      players: lobby.players,
      gameState: lobby.gameState,
    });

    console.log(
      `[Server] Player ${playerName} (${socket.id}) joined lobby ${lobbyId}`
    );
  });

  socket.on("disconnect", () => {
    console.log(`[Server] Client disconnected: ${socket.id}`);

    lobbies.forEach((lobby, lobbyId) => {
      const playerIndex = lobby.players.findIndex((p) => p.id === socket.id);

      if (playerIndex !== -1) {
        const player = lobby.players[playerIndex];
        lobby.players.splice(playerIndex, 1);

        console.log(`[Server] ${player.name} left ${lobbyId}`);

        io.to(lobbyId).emit("lobby-update", {
          players: lobby.players,
        });

        if (lobby.players.length === 0) {
          lobbies.delete(lobbyId);
          console.log(`[Server] Deleted empty lobby ${lobbyId}`);
        }
      }
    });
  });

  socket.on("chat-message-req", async ({ lobbyId, playerId, message }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    const player = lobby.players.find((p) => p.id === socket.id);
    if (!player) return;

    // ROUND ONE LOGIC
    if (
      lobby.gameState === "roundOne" &&
      lobby.activeQuestion &&
      lobby.activeQuestion.targetPlayer === socket.id
    ) {
      if (lobby.activeQuestion.timeoutId) {
        clearInterval(lobby.activeQuestion.timeoutId);
        lobby.activeQuestion.timeoutId = undefined;
      }

      io.to(lobbyId).emit("timer-stop");
      io.to(lobbyId).emit("timer-update", {
        timeRemaining: 0,
        totalTime: 0,
        targetPlayer: "",
      } as Shared.TimerUpdate);

      io.to(lobbyId).emit("chat-message-broadcast", {
        playerId: player.id,
        playerName: player.name,
        message: message,
        timestamp: Date.now(),
      });

      const userAnswer = message.trim().toLowerCase();
      const correctAnswer = lobby.activeQuestion.answer.trim().toLowerCase();

      let announcementDuration = 0;

      if (userAnswer.includes(correctAnswer)) {
        console.log(`[Server] ${player.name} answered correctly`);
        announcementDuration = 2000;
        io.to(lobbyId).emit("announcement", {
          type: "info",
          message: "Dobrze.",
          duration: announcementDuration,
        } as Shared.Announcement);

        if (player.score !== undefined) {
          player.score += 1;
        }
      } else {
        console.log(`[Server] ${player.name} answered incorrectly`);

        if (player.lives !== undefined && player.lives > 0) {
          player.lives -= 1;
          announcementDuration = 3000;

          io.to(lobbyId).emit("announcement", {
            type: "info",
            message: `Nie, to "${correctAnswer}"`,
            duration: announcementDuration,
          } as Shared.Announcement);

          console.log(
            `[Server] ${player.name} lost a life. Lives: ${player.lives}`
          );
        }
      }

      io.to(lobbyId).emit("lobby-update", {
        players: lobby.players,
        gameState: lobby.gameState,
      });

      delete lobby.activeQuestion;

      await wait(announcementDuration + 1000);
      continueRoundOne(lobby, lobbyId);

      return;
    }

    // ROUND TWO LOGIC
    if (lobby.gameState === "roundTwo") {
      // HANDLE ANSWER FROM TARGET
      if (
        lobby.activeQuestion &&
        lobby.activeQuestion.targetPlayer === socket.id
      ) {
        if (lobby.activeQuestion.timeoutId) {
          clearInterval(lobby.activeQuestion.timeoutId);
          lobby.activeQuestion.timeoutId = undefined;
        }

        io.to(lobbyId).emit("timer-stop");
        io.to(lobbyId).emit("timer-update", {
          timeRemaining: 0,
          totalTime: 0,
          targetPlayer: "",
        } as Shared.TimerUpdate);

        io.to(lobbyId).emit("chat-message-broadcast", {
          playerId: player.id,
          playerName: player.name,
          message: message,
          timestamp: Date.now(),
        });

        const userAnswer = message.trim().toLowerCase();
        const correctAnswer = lobby.activeQuestion.answer.trim().toLowerCase();

        let announcementDuration = 0;

        if (userAnswer.includes(correctAnswer)) {
          console.log(`[Server] ${player.name} answered correctly in Round Two`);
          announcementDuration = 2000;
          io.to(lobbyId).emit("announcement", {
            type: "info",
            message: "Dobrze.",
            duration: announcementDuration,
          } as Shared.Announcement);

          if (player.score !== undefined) {
            player.score += 1;
          }

          // player chooses next player
          lobby.roundTwoState = {
            currentPlayerIndex: lobby.players.indexOf(player),
            waitingForPlayerChoice: true,
            currentChooser: player.id,
            lastChooser: player.id,
          };

          console.log(
            `[Server] ${player.name} is choosing the next player to answer`
          );

          io.to(lobbyId).emit("lobby-update", {
            players: lobby.players,
            gameState: lobby.gameState,
          });

          delete lobby.activeQuestion;

          await wait(announcementDuration + 1000);

          io.to(lobbyId).emit("announcement", {
            type: "info",
            message: `${player.name}, wybierz następnego gracza (1-${lobby.players.length})`,
            duration: 15000,
          } as Shared.Announcement);
        } else {
          console.log(`[Server] ${player.name} answered incorrectly in Round Two`);

          if (player.lives !== undefined && player.lives > 0) {
            player.lives -= 1;
            announcementDuration = 3000;

            io.to(lobbyId).emit("announcement", {
              type: "info",
              message: `Nie, to "${correctAnswer}"`,
              duration: announcementDuration,
            } as Shared.Announcement);

            console.log(
              `[Server] ${player.name} lost a life. Lives: ${player.lives}`
            );
          }

          io.to(lobbyId).emit("lobby-update", {
            players: lobby.players,
            gameState: lobby.gameState,
          });

          delete lobby.activeQuestion;

          await wait(announcementDuration + 1000);
          
          // CHECK IF CHOSEN
          if (lobby.roundTwoState?.lastChooser && lobby.roundTwoState.lastChooser !== player.id) {
            // CHOOSER - CHOOSE AGAIN
            const chooserPlayer = lobby.players.find(p => p.id === lobby.roundTwoState?.lastChooser);
            
            if (chooserPlayer) {
              lobby.roundTwoState.waitingForPlayerChoice = true;
              lobby.roundTwoState.currentChooser = chooserPlayer.id;
              
              console.log(
                `[Server] ${chooserPlayer.name} gets to choose again after ${player.name} failed`
              );

              io.to(lobbyId).emit("announcement", {
                type: "info",
                message: `${chooserPlayer.name}, wybierz następnego gracza (1-${lobby.players.length})`,
                duration: 15000,
              } as Shared.Announcement);
            } else {
              // TEMPORARY
              continueRoundTwo(lobby, lobbyId, false);
            }
          } else {
            // SHOULDNT HAPPEN
            continueRoundTwo(lobby, lobbyId, false);
          }
        }

        return;
      }

      // Handle player selection from the chooser
      if (
        lobby.roundTwoState?.waitingForPlayerChoice &&
        lobby.roundTwoState.currentChooser === socket.id
      ) {
        const choiceNumber = parseInt(message.trim());

        if (
          isNaN(choiceNumber) ||
          choiceNumber < 1 ||
          choiceNumber > lobby.players.length
        ) {
          io.to(socket.id).emit("announcement", {
            type: "info",
            message: `Wybierz numer od 1 do ${lobby.players.length}`,
            duration: 2000,
          } as Shared.Announcement);
          return;
        }

        io.to(lobbyId).emit("chat-message-broadcast", {
          playerId: player.id,
          playerName: player.name,
          message: message,
          timestamp: Date.now(),
        });

        const selectedPlayerIndex = choiceNumber - 1;
        lobby.roundTwoState.nextPlayerIndex = selectedPlayerIndex;
        lobby.roundTwoState.waitingForPlayerChoice = false;

        const selectedPlayer = lobby.players[selectedPlayerIndex];
        io.to(lobbyId).emit("announcement", {
          type: "info",
          message: `${selectedPlayer.name} został wybrany!`,
          duration: 2000,
        } as Shared.Announcement);

        await wait(3000);

        continueRoundTwo(lobby, lobbyId, true);

        return;
      }
    }

    // Regular chat message
    io.to(lobbyId).emit("chat-message-broadcast", {
      playerId: playerId,
      playerName: player.name,
      message: message,
      timestamp: Date.now(),
    });

    console.log(`[Server] ${player.name}: ${message}`);
    console.log(lobby.gameState);
  });

  // START GAME LOGIC
  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  socket.on("start-game", async ({ lobbyId }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    if (socket.id !== lobby.players[0]?.id) return;

    lobby.gameState = "roundOne";

    lobby.players.forEach((player) => {
      player.lives = 3;
      player.score = 0;
    });

    io.to(lobbyId).emit("announcement", {
      type: "game-start",
      message: "Game starting...",
      duration: 3000,
    });

    await wait(4000);
    console.log(`[Server] Game started in lobby ${lobbyId}`);

    io.to(lobbyId).emit("announcement", {
      type: "modal",
      message: "shufflingPlayers",
      duration: 2000,
    });

    console.log("[Server] Opened modal");

    await wait(1000);

    const shuffledOrder = [...lobby.players]
      .map((player, index) => ({ player, index }))
      .sort(() => Math.random() - 0.5)
      .map(({ player }) => player);

    lobby.players = shuffledOrder;
    console.log("[Server] Shuffled the players' order");

    io.to(lobbyId).emit("lobby-update", {
      players: lobby.players,
      gameState: lobby.gameState,
    });

    console.log("[Server] Sent lobby-update");

    await wait(lobby.players.length * 1000 + 3000);

    io.to(lobbyId).emit("announcement", {
      type: "closeModal",
      message: "",
      duration: 1000,
    });

    lobby.roundOneQuestions = prepareRoundOneQuestions(lobby.players);
    lobby.currentQuestionIndex = 0;

    await wait(2000);

    console.log(
      "[Server] Starting Round One with questions:",
      lobby.roundOneQuestions
    );

    playRoundOne(lobby, lobbyId);
  });
});

const prepareRoundOneQuestions = (players: Shared.Player[]) => {
  const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  const questionsPath = join(__dirname, "questions.json");
  const questionsData = readFileSync(questionsPath, "utf-8");
  const questionsJson = JSON.parse(questionsData);
  const allQuestions: Shared.Question[] = questionsJson.round1;

  const shuffledQuestions = shuffleArray(allQuestions);

  const questionsNeeded = players.length * 2;

  const selectedQuestions = shuffledQuestions.slice(0, questionsNeeded);

  return selectedQuestions;
};

const prepareRoundTwoQuestions = () => {
  const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  const questionsPath = join(__dirname, "questions.json");
  const questionsData = readFileSync(questionsPath, "utf-8");
  const questionsJson = JSON.parse(questionsData);
  const allQuestions: Shared.Question[] = questionsJson.round2 || questionsJson.round1;

  return shuffleArray(allQuestions);
};

const playRoundOne = (lobby: Shared.Lobby, lobbyId: string) => {
  if (!lobby.roundOneQuestions || lobby.roundOneQuestions.length === 0) {
    console.log("[Server] No questions available for Round One");
    return;
  }

  if (lobby.currentQuestionIndex === undefined) {
    lobby.currentQuestionIndex = 0;
  }

  askNextQuestion(lobby, lobbyId);
};

const continueRoundOne = async (lobby: Shared.Lobby, lobbyId: string) => {
  if (lobby.currentQuestionIndex === undefined) {
    lobby.currentQuestionIndex = 0;
  }

  lobby.currentQuestionIndex += 1;

  if (
    !lobby.roundOneQuestions ||
    lobby.currentQuestionIndex >= lobby.roundOneQuestions.length
  ) {
    console.log("[Server] Round One completed!");
    const completionDuration = 2000;

    io.to(lobbyId).emit("timer-stop");
    io.to(lobbyId).emit("timer-update", {
      timeRemaining: 0,
      totalTime: 0,
      targetPlayer: "",
    } as Shared.TimerUpdate);

    io.to(lobbyId).emit("announcement", {
      type: "info",
      message: "Round One completed!",
      duration: completionDuration,
    } as Shared.Announcement);

    await wait(completionDuration + 1000);

    // Start Round Two
    startRoundTwo(lobby, lobbyId);
    return;
  }

  io.to(lobbyId).emit("timer-stop");
  io.to(lobbyId).emit("timer-update", {
    timeRemaining: 0,
    totalTime: 0,
    targetPlayer: "",
  } as Shared.TimerUpdate);

  await askNextQuestion(lobby, lobbyId);
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const askNextQuestion = async (lobby: Shared.Lobby, lobbyId: string) => {
  if (
    !lobby.roundOneQuestions ||
    lobby.currentQuestionIndex === undefined ||
    lobby.currentQuestionIndex >= lobby.roundOneQuestions.length
  ) {
    return;
  }

  const currentQuestion = lobby.roundOneQuestions[lobby.currentQuestionIndex];
  const targetPlayerIndex = lobby.currentQuestionIndex % lobby.players.length;
  const targetPlayer = lobby.players[targetPlayerIndex];

  console.log(
    `[Server] Asking question ${lobby.currentQuestionIndex + 1}/${
      lobby.roundOneQuestions.length
    } to ${targetPlayer.name}`
  );

  lobby.activeQuestion = {
    questionId: currentQuestion.id,
    text: currentQuestion.question,
    answer: currentQuestion.answer,
    targetPlayer: targetPlayer.id,
    askedAt: new Date(),
  };
  console.log(`[Server] ${lobby.activeQuestion?.text}`);
  console.log(`[Server] ${lobby.activeQuestion.answer}`);

  const duration = currentQuestion.question.split(" ").length * 500 + 1000;

  io.to(lobbyId).emit("announcement", {
    type: "question",
    message: currentQuestion.question,
    targetPlayer: targetPlayer.id,
    duration: duration,
  } as any);

  await wait(duration);

  if (
    !lobby.activeQuestion ||
    lobby.activeQuestion.questionId !== currentQuestion.id
  ) {
    console.log(
      `[Server] Question was already answered during announcement, skipping timer`
    );
    return;
  }

  startAnswerTimer(lobby, lobbyId, targetPlayer);
};

const startAnswerTimer = (
  lobby: Shared.Lobby,
  lobbyId: string,
  targetPlayer: Shared.Player
) => {
  const ANSWER_TIME = 3000;
  const TICK_INTERVAL = 100;
  let timeRemaining = ANSWER_TIME;

  if (lobby.activeQuestion?.timeoutId) {
    clearInterval(lobby.activeQuestion.timeoutId);
  }

  const timerInterval = setInterval(() => {
    timeRemaining -= TICK_INTERVAL;

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      handleTimeout(lobby, lobbyId, targetPlayer);
      return;
    }

    io.to(lobbyId).emit("timer-update", {
      timeRemaining,
      totalTime: ANSWER_TIME,
      targetPlayer: targetPlayer.id,
    } as Shared.TimerUpdate);
  }, TICK_INTERVAL);

  if (lobby.activeQuestion) {
    lobby.activeQuestion.timeoutId = timerInterval;
  }
};

const handleTimeout = async (
  lobby: Shared.Lobby,
  lobbyId: string,
  targetPlayer: Shared.Player
) => {
  if (!lobby.activeQuestion) return;

  console.log(`[Server] ${targetPlayer.name} ran out of time`);

  io.to(lobbyId).emit("timer-stop");
  io.to(lobbyId).emit("timer-update", {
    timeRemaining: 0,
    totalTime: 0,
    targetPlayer: "",
  } as Shared.TimerUpdate);

  if (targetPlayer.lives !== undefined && targetPlayer.lives > 0) {
    targetPlayer.lives -= 1;
    const announcementDuration = 3000;

    io.to(lobbyId).emit("announcement", {
      type: "info",
      message: `To "${lobby.activeQuestion.answer}"`,
      duration: announcementDuration,
    } as Shared.Announcement);

    console.log(`[Server] ${targetPlayer.name} lost a life.`);
  }

  io.to(lobbyId).emit("lobby-update", {
    players: lobby.players,
    gameState: lobby.gameState,
  });

  delete lobby.activeQuestion;

  await wait(3000 + 1000);

  if (lobby.gameState === "roundOne") {
    continueRoundOne(lobby, lobbyId);
  } else if (lobby.gameState === "roundTwo") {
    // Check if player was chosen by someone else
    if (lobby.roundTwoState?.lastChooser && lobby.roundTwoState.lastChooser !== targetPlayer.id) {
      // The chooser gets to pick again
      const chooserPlayer = lobby.players.find(p => p.id === lobby.roundTwoState?.lastChooser);
      
      if (chooserPlayer) {
        lobby.roundTwoState.waitingForPlayerChoice = true;
        lobby.roundTwoState.currentChooser = chooserPlayer.id;
        
        console.log(
          `[Server] ${chooserPlayer.name} gets to choose again after ${targetPlayer.name} timed out`
        );

        io.to(lobbyId).emit("announcement", {
          type: "info",
          message: `${chooserPlayer.name}, wybierz następnego gracza (1-${lobby.players.length})`,
          duration: 15000,
        } as Shared.Announcement);
      } else {
        continueRoundTwo(lobby, lobbyId, false);
      }
    } else {
      continueRoundTwo(lobby, lobbyId, false);
    }
  }
};

// ROUND TWO
const startRoundTwo = async (lobby: Shared.Lobby, lobbyId: string) => {
  console.log("[Server] Starting Round Two");

  lobby.gameState = "roundTwo";
  lobby.roundTwoQuestions = prepareRoundTwoQuestions();
  lobby.currentQuestionIndex = 0;

  io.to(lobbyId).emit("announcement", {
    type: "info",
    message: "Druga runda!",
    duration: 3000,
  } as Shared.Announcement);

  io.to(lobbyId).emit("lobby-update", {
    players: lobby.players,
    gameState: lobby.gameState,
  });

  await wait(4000);

  playRoundTwo(lobby, lobbyId);
};

const playRoundTwo = (lobby: Shared.Lobby, lobbyId: string) => {
  if (!lobby.roundTwoQuestions || lobby.roundTwoQuestions.length === 0) {
    console.log("[Server] No questions available for Round Two");
    return;
  }

  // Start with player 1 (index 0)
  lobby.roundTwoState = {
    currentPlayerIndex: 0,
    waitingForPlayerChoice: false,
  };

  askRoundTwoQuestion(lobby, lobbyId, 0);
};

const continueRoundTwo = async (
  lobby: Shared.Lobby,
  lobbyId: string,
  playerChoseNext: boolean
) => {
  // Check if round should end

  //CONFIGURABLE No. OF PLAYERS TO END 
  const activePlayers = lobby.players.filter((p) => p.lives && p.lives > 0);
  const minPlayersToEnd = lobby.players.length < 5 ? 2 : 3;

  if (activePlayers.length <= minPlayersToEnd) {
    console.log("[Server] Round Two completed!");
    
    io.to(lobbyId).emit("announcement", {
      type: "info",
      message: "Koniec rundy drugiej",
      duration: 3000,
    } as Shared.Announcement);

    lobby.gameState = "ended";
    
    io.to(lobbyId).emit("lobby-update", {
      players: lobby.players,
      gameState: lobby.gameState,
    });

    return;
  }

  let nextPlayerIndex: number;

  if (playerChoseNext && lobby.roundTwoState?.nextPlayerIndex !== undefined) {
    // Player chose the next player
    nextPlayerIndex = lobby.roundTwoState.nextPlayerIndex;
  } else {
    // Move to next player in sequence
    if (!lobby.roundTwoState) {
      lobby.roundTwoState = { currentPlayerIndex: 0, waitingForPlayerChoice: false };
    }
    
    nextPlayerIndex = (lobby.roundTwoState.currentPlayerIndex + 1) % lobby.players.length;
    
    // Skip players with no lives
    let attempts = 0;
    while (
      (!lobby.players[nextPlayerIndex] || (lobby.players[nextPlayerIndex].lives ?? 0) <= 0) &&
      attempts < lobby.players.length
    ) {
      nextPlayerIndex = (nextPlayerIndex + 1) % lobby.players.length;
      attempts++;
    }
    
    // Clear lastChooser when moving sequentially
    if (lobby.roundTwoState) {
      lobby.roundTwoState.lastChooser = undefined;
    }
  }

  lobby.roundTwoState.currentPlayerIndex = nextPlayerIndex;
  lobby.roundTwoState.nextPlayerIndex = undefined;

  await wait(1000);
  askRoundTwoQuestion(lobby, lobbyId, nextPlayerIndex);
};

const askRoundTwoQuestion = async (
  lobby: Shared.Lobby,
  lobbyId: string,
  playerIndex: number
) => {
  if (!lobby.roundTwoQuestions || lobby.roundTwoQuestions.length === 0) {
    console.log("[Server] No more questions for Round Two");
    return;
  }

  // Get a random question
  const randomIndex = Math.floor(Math.random() * lobby.roundTwoQuestions.length);
  const currentQuestion = lobby.roundTwoQuestions[randomIndex];
  
  const targetPlayer = lobby.players[playerIndex];

  if (!targetPlayer || !targetPlayer.lives || targetPlayer.lives <= 0) {
    console.log("[Server] Target player has no lives, moving to next");
    // continueRoundTwo(lobby, lobbyId, false);
    return;
  }

  console.log(
    `[Server] Round Two: Asking question to ${targetPlayer.name}`
  );

  lobby.activeQuestion = {
    questionId: currentQuestion.id,
    text: currentQuestion.question,
    answer: currentQuestion.answer,
    targetPlayer: targetPlayer.id,
    askedAt: new Date(),
  };

  console.log(`[Server] ${lobby.activeQuestion?.text}`);
  console.log(`[Server] ${lobby.activeQuestion.answer}`);

  const duration = currentQuestion.question.split(" ").length * 500 + 1000;

  io.to(lobbyId).emit("announcement", {
    type: "question",
    message: currentQuestion.question,
    targetPlayer: targetPlayer.id,
    duration: duration,
  } as any);

  await wait(duration);

  if (
    !lobby.activeQuestion ||
    lobby.activeQuestion.questionId !== currentQuestion.id
  ) {
    console.log(
      `[Server] Question was already answered during announcement, skipping timer`
    );
    return;
  }

  startAnswerTimer(lobby, lobbyId, targetPlayer);
};

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`[Server] Express + Socket.IO server running on port ${PORT}`);
});