export interface Player {
  id: string;
  name: string;
}

export interface Lobby {
  id: string;
  players: Player[];
  createdAt: Date;
  gameState: GameState;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  visible?: boolean;
}

export interface Announcement {
  type: "info" | "wrong-answer" | "right-answer" | "game-start" | "game-end";
  message: string;
  gameState?: GameState;
}

export interface GameState {
  stage: "lobby" | "roundOne" | "roundTwo" | "roundThree" | "ended" | null;
}
