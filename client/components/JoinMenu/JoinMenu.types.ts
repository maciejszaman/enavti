import { Socket } from "socket.io-client";
import * as Shared from "@enavti/shared-types";
import { Dispatch, SetStateAction } from "react";

export interface JoinMenuProps {
  socket: Socket | null;
  lobbyId: string;
  setPlayerName: Dispatch<SetStateAction<string | null>>;
  players: Shared.Player[];
}
