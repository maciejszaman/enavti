import React from "react";
import * as Shared from "@enavti/shared-types";
import { motion } from "framer-motion";

interface RoundOneSummaryProps {
  data: { players: Shared.Player[] };
}

export const RoundOneSummary = ({ data }: RoundOneSummaryProps) => {
  return (
    <div className="flex flex-col p-2 text-center">
      <div className="text-2xl p-2">Round One</div>
      <div className="h-[2px] bg-[#27272a] mb-2"></div>

      <div className="flex flex-col">
        {data.players.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: player.eliminated ? 0.35 : 1, x: 0 }}
            className="grid grid-cols-[2rem_1fr_auto] items-center border-b border-[#27272a] last:border-0"
            transition={{ delay: index * 0.3, duration: 1, type: "spring" }}
          >
            <div className="p-2 text-amber-300 text-left">{index + 1}.</div>
            <div className={`p-2 text-left ${player.eliminated ? "line-through" : ""}`}>
              {player.name}
            </div>
            <div className="p-2 flex justify-end gap-2">
              {player.eliminated ? (
                <span className="text-red-400 text-sm">OUT</span>
              ) : (
                [...Array(player.lives ?? 0)].map((_, i) => (
                  <div key={i} className="h-3 w-3 bg-amber-300" />
                ))
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
