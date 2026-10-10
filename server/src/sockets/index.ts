// Registers all socket event handlers for every new connection

import type { Server } from "socket.io";
import { DEBUG_ENABLED } from "../config";
import { registerLobbyHandlers } from "./lobbyHandlers";
import { registerChatHandlers } from "./chatHandlers";
import { registerGameHandlers } from "./gameHandlers";
import { registerDebugHandlers } from "./debugHandlers";

export const registerSocketHandlers = (io: Server) => {
  io.on("connection", (socket) => {
    console.log(`[Server] Client connected: ${socket.id}`);

    registerLobbyHandlers(socket);
    registerChatHandlers(socket);
    registerGameHandlers(socket);

    // TEMPORARY DEBUG MENU - disabled when NODE_ENV=production
    if (DEBUG_ENABLED) {
      registerDebugHandlers(socket);
    }
  });
};
