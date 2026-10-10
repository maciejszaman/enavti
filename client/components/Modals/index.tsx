import React from "react";
import * as Shared from "@enavti/shared-types";
import { ShufflingPlayers } from "./ShufflingPlayers";
import { RoundOneSummary } from "./RoundOneSummary";

interface ModalContentProps {
  header: Shared.ModalType | null;
  data: { players: Shared.Player[] };
}

export const ModalContent = ({ header, data }: ModalContentProps) => {
  switch (header) {
    case "shufflingPlayers":
      return <ShufflingPlayers data={data} />;
    case "roundOneSummary":
      return <RoundOneSummary data={data} />;
  }
};
