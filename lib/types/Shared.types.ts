export interface Player {
  id: string;
  name: string;
  character?: "maciej.svg" | "kuba.svg";
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
  type: AnnouncementType;
  message: string | ModalType;
  gameState?: GameState;
  shuffledOrder?: Player[];
}

export interface Modal {
  type: ModalType | null;
  open: boolean;
}

export type ModalType =
  | "shufflingPlayers"
  | "roundOneSummary"
  | "roundTwoSummary"
  | "gameSummary";

export type GameState =
  | "lobby"
  | "roundOne"
  | "roundTwo"
  | "roundThree"
  | "ended"
  | null;

export type AnnouncementType =
  | "info"
  | "wrong-answer"
  | "right-answer"
  | "game-start"
  | "game-end"
  | "modal"
  | "closeModal";
