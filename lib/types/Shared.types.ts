export interface Player {
  id: string;
  name: string;
}

export interface Lobby {
  id: string;
  players: Player[];
  createdAt: Date;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  visible?: boolean;
}
