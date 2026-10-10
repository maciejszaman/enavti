// Entry point - wires everything together and starts listening.
// See README.md for where the actual logic lives.

import { app, httpServer, io } from "./src/io";
import { PORT } from "./src/config";
import { registerRoutes } from "./src/http/routes";
import { registerSocketHandlers } from "./src/sockets";

registerRoutes(app);
registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`[Server] Express + Socket.IO server running on port ${PORT}`);
});
