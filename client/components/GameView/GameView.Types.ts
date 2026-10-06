import { Socket } from "socket.io-client";
import * as Shared from "@enavti/shared-types"

export interface GameViewProps {
  players: Shared.Player[];
  currentPlayerId?: string;
  socket: Socket | null;
  gameState: Shared.GameState;
}
