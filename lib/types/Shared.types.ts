export interface Player {
  id: string;
  name: string;
}

export interface Lobby {
  id: string;
  players: Player[];
  createdAt: Date;
}
