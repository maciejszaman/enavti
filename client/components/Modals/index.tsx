import React from "react";
import * as Shared from "../../../lib/types/Shared.types";
import { ShufflingPlayers } from "./ShufflingPlayers";

interface ModalContentProps {
  header: Shared.ModalType | null;
  data: { players: Shared.Player[] };
}

export const ModalContent = ({ header, data }: ModalContentProps) => {
  switch (header) {
    case "shufflingPlayers":
      return <ShufflingPlayers data={data} />;
  }
};
