import React, { useEffect } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import * as Shared from "@enavti/shared-types";

interface PlayerCharacterProps {
  player: Shared.Player;
  // Changes every time the player sends a chat message
  talkCount?: number;
}

export const PlayerCharacter = ({ player, talkCount }: PlayerCharacterProps) => {
  const reduceMotion = useReducedMotion();
  const controls = useAnimationControls();

  // Small bob while speaking
  useEffect(() => {
    if (!talkCount || reduceMotion) return;
    controls.start({
      y: [0, -2, 0],
      scaleY: [1, 1.01, 1],
      transition: { duration: 0.25, ease: "easeOut" },
    });
    // Only replay when a new message arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talkCount]);

  return (
    <>
      <motion.div
        animate={controls}
        style={{ transformOrigin: "bottom center" }}
        className="z-20"
      >
        <img
          src={`/svg${player.character?.character}v${player.character?.clothesColor}.svg`}
          alt="Player"
          className="playerCharacterImg object-contain"
          draggable={false}
        />
      </motion.div>
      <div className="h-8 w-32 absolute bottom-0 translate-y-2.5 z-0 rounded-2xl bg-black/20"></div>
    </>
  );
};
