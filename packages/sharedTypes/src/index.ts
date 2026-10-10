export interface Player {
  id: string;
  name: string;
  character?: Character;
  lives?: number;
  score?: number;
  // Out of the game (failed round one, lost all lives, or joined mid-game).
  // Stays in the lobby as a spectator and can still chat.
  eliminated?: boolean;
}

export interface Question {
  id: number;
  category?: string;
  question: string;
  answer: string;
  source?: string;
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
    timeoutId?: ReturnType<typeof setInterval>;
  };
  // How many players took part when the game started (late joiners don't count)
  startingPlayerCount?: number;
  roundOneQuestions?: Question[];
  // Player ids in the order they get asked in round one (one entry per question)
  roundOneTurns?: string[];
  // Player id -> how many round one questions they missed (wrong or timed out)
  roundOneMisses?: Record<string, number>;
  roundTwoQuestions?: Question[];
  roundTwoState?: {
    currentPlayerId: string;
    waitingForPlayerChoice: boolean;
    currentChooser?: string;
    // Who chose the current player. If they miss, this player chooses again.
    chosenBy?: string;
  };

  roundThreeQuestions?: Question[];
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

export interface TimerUpdate {
  timeRemaining: number;
  totalTime: number;
  targetPlayer: string;
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
