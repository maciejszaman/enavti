// REST endpoints

import type { Express } from "express";
import { lobbies, createLobby } from "../lobbies";

export const registerRoutes = (app: Express) => {
  app.get("/health", (req, res) => {
    res.send("OK");
  });

  app.get("/lobbies", (req, res) => {
    res.json(Array.from(lobbies.values()));
  });

  app.get("/api/lobby/:lobbyId", (req, res) => {
    const lobby = lobbies.get(req.params.lobbyId);

    if (!lobby) {
      res.status(404).json({ exists: false, message: "Lobby not found" });
      return;
    }

    res.json({ exists: true, lobby });
  });

  app.post("/createLobby", (req, res) => {
    const lobby = createLobby();

    res.json({
      lobbyId: lobby.id,
      message: "Lobby created successfully",
    });
  });
};
