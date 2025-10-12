import React from "react";
import * as Shared from "../../../lib/types/Shared.types";
import { ShufflingPlayers } from "./ShufflingPlayers";

interface ModalContentProps {
  type: Shared.ModalType | null;
  data: { players: Shared.Player[] };
}

export const ModalContent = ({ type, data }: ModalContentProps) => {
  switch (type) {
    case "shufflingPlayers":
      return <ShufflingPlayers data={data} />;
  }
};
