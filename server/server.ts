import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import * as Shared from "../lib/types/Shared.types";

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

  socket.on("join-lobby", ({ lobbyId, playerName }) => {
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

        // Remove empty lobbies
        if (lobby.players.length === 0) {
          lobbies.delete(lobbyId);
          console.log(`[Server] Deleted empty lobby ${lobbyId}`);
        }
      }
    });
  });

  socket.on("chat-message-req", ({ lobbyId, playerId, message }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    const player = lobby.players.find((p) => p.id === socket.id);
    if (!player) return;

    io.to(lobbyId).emit("chat-message-broadcast", {
      playerId: playerId,
      playerName: player.name,
      message: message,
      timestamp: Date.now(),
    });

    ///PLACEHOLDER -------- REMOVE LATER

    // const announcement: Shared.Announcement = {
    //   type: "info",
    //   message: `[${message}]`,
    // };
    // io.to(lobbyId).emit("announcement", announcement);

    console.log(`[Server] ${player.name}: ${message}`);
    console.log(lobby.gameState);
  });
  // START GAME LOGIC

  socket.on("start-game", ({ lobbyId }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;
    if (socket.id !== lobby.players[0]?.id) return; // Sender must be the host

    lobby.gameState = "roundOne";

    io.to(lobbyId).emit("lobby-update", {
      players: lobby.players,
      gameState: lobby.gameState,
    });

    const announcement: Shared.Announcement = {
      type: "game-start",
      message: "Game started",
      gameState: lobby.gameState,
    };
    io.to(lobbyId).emit("announcement", announcement);
    console.log(`[Server] Game started in lobby ${lobbyId}`);

    setTimeout(() => {
      const announcement: Shared.Announcement = {
        type: "modal",
        message: "shufflingPlayers",
      };

      const shuffledOrder = [...lobby.players]
        .map((player, index) => ({ player, index }))
        .sort(() => Math.random() - 0.5)
        .map(({ player }) => player);

      lobby.players = shuffledOrder;

      io.to(lobbyId).emit("lobby-update", {
        players: lobby.players,
        gameState: lobby.gameState,
      });

      setTimeout(() => {
        const announcement: Shared.Announcement = {
          type: "closeModal",
          message: "",
        };

        io.to(lobbyId).emit("announcement", announcement);
      }, lobby.players.length * 1000 + 5000);

      io.to(lobbyId).emit("announcement", announcement);
    }, 3000);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`[Server] Express + Socket.IO server running on port ${PORT}`);
});
