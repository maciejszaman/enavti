// Express app, HTTP server and Socket.IO instance.
// Imported by anything that needs to emit events to clients.

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

export const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

export const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
