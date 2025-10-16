import React, { useEffect, useState } from "react";
import * as Shared from "@enavti/shared-types";
import { motion } from "framer-motion";
import { LucideLoader } from "lucide-react";

interface ShufflingPlayersProps {
  data: { players: Shared.Player[] };
}

export const ShufflingPlayers = ({ data }: ShufflingPlayersProps) => {
  const [isShuffling, setIsShuffling] = useState(true);

  setTimeout(() => {
    setIsShuffling(false);
  }, 1000);

  return (
    <div className="flex flex-col p-2 text-center">
      <div className="text-2xl p-2">Shuffling players</div>
      <div className="h-[2px] bg-[#27272a]"></div>

      {isShuffling ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <LucideLoader className="animate-spin" />
        </motion.div>
      ) : (
        <div className="flex flex-col">
          {data.players.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-2 border-b border-[#27272a] last:border-0"
              transition={{ delay: index * 1, duration: 1 }}
            >
              <div className="p-2 text-left">{player.name}</div>
              <div className="p-2 text-right">{index + 1}</div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
