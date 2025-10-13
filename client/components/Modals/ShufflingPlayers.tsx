import React, { useEffect, useState } from "react";
import * as Shared from "../../../lib/types/Shared.types";
import { motion } from "framer-motion";
import { LucideLoader } from "lucide-react";

interface ShufflingPlayersProps {
  data: { players: Shared.Player[] };
}

export const ShufflingPlayers = ({ data }: ShufflingPlayersProps) => {
  const [isShuffling, setIsShuffling] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsShuffling(false);
    }, 1500);
  }, []);

  return (
    <div className="flex flex-col modalContent text-center">
      <div className="text-2xl modalContent">Shuffling players</div>
      <div className="h-[2px] bg-[#27272a]"></div>

      {isShuffling ? (
        <LucideLoader className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
      ) : (
        data.players.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20, color: "yellow" }}
            animate={{ opacity: 1, x: 0, color: "white" }}
            className="grid grid-cols-2"
            transition={{ delay: index * 1 }}
          >
            <div className="modalPlayer">{player.name}</div>
            <div className="modalPlayer">{index + 1}</div>
          </motion.div>
        ))
      )}
    </div>
  );
};
