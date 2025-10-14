export interface Player {
  id: string;
  name: string;
  character?: Character;
  lives?: number;
  score?: number;
}

export interface Question {
  id: number;
  question: string;
  answer: string;
  multiple_choice: boolean;
}

export interface Lobby {
  id: string;
  players: Player[];
  createdAt: Date;
  gameState: GameState;
  activeQuestion?: {
    questionId: number;
    text: string;
    answer: string;
    targetPlayer: string;
    askedAt: Date;
  };
  roundOneQuestions?: Question[];
  currentQuestionIndex?: number;
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
  duration: number;
  targetPlayer?: string;
}

export interface Modal {
  header: ModalType | null;
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
  | "question"
  | "wrong-answer"
  | "right-answer"
  | "game-start"
  | "game-end"
  | "modal"
  | "closeModal";

export type Character = {
  character: number;
  clothesColor: number;
};
