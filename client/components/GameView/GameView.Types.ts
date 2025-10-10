import { Socket } from "socket.io-client";
import * as Shared from "../../../../lib/types/Shared.types";

export interface GameViewProps {
  players: Shared.Player[];
  currentPlayerId?: string;
  chatMessages: Shared.ChatMessage[];
  socket: Socket | null;
}
