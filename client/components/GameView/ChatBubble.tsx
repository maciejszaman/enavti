import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { ChatBubble as ChatBubbleData } from "@/hooks/useChat";

// Typewriter reveal: fast, and never longer than MAX_TYPE_TIME in total
const TYPE_TIME_PER_CHAR = 30;
const MAX_TYPE_TIME = 500;

const useTypewriter = (text: string) => {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    const step = Math.min(TYPE_TIME_PER_CHAR, MAX_TYPE_TIME / text.length);
    const interval = setInterval(() => {
      setShown((n) => {
        if (n + 1 >= text.length) clearInterval(interval);
        return n + 1;
      });
    }, step);
    return () => clearInterval(interval);
  }, [text]);

  return shown;
};

const verdictStyles = {
  right: "bg-emerald-50 border-emerald-500 text-emerald-900",
  wrong: "bg-red-50 border-red-500 text-red-900",
};

const verdictAnimation = {
  right: { scale: [1, 1.15, 0.95, 1], x: 0 },
  wrong: { x: [0, -7, 7, -5, 5, -2, 0], scale: 1 },
};

// Spectator chatter: dark like the rest of the UI and see-through
const mutedStyle = "bg-[#111111] border-[#27272a] text-white/70 shadow-none";
const MUTED_OPACITY = 0.6;

interface ChatBubbleProps {
  bubble: ChatBubbleData;
  isOwn: boolean;
  // Cancels out the stage perspective, so the bubbles of players in the back
  // are as big and readable as the ones in front
  scale?: number;
  // Toned down, without the pop, float and typing animations
  muted?: boolean;
}

export const ChatBubble = ({
  bubble,
  isOwn,
  scale = 1,
  muted = false,
}: ChatBubbleProps) => {
  const typed = useTypewriter(bubble.message);
  const shown = muted ? bubble.message.length : typed;

  const colors = muted
    ? mutedStyle
    : bubble.verdict
      ? verdictStyles[bubble.verdict]
      : `bg-white text-black ${isOwn ? "border-amber-300" : "border-[#afafaf]"}`;

  return (
    // Entrance / exit: pops out of the player's head, muted ones just fade in
    <motion.div
      initial={
        muted
          ? { opacity: 0, scale }
          : { opacity: 0, scale: 0.3 * scale, y: 30 }
      }
      animate={{ opacity: muted ? MUTED_OPACITY : 1, scale, y: 0 }}
      exit={{
        opacity: 0,
        scale: 0.85 * scale,
        y: -24,
        filter: "blur(3px)",
        transition: { duration: 0.25, ease: "easeIn" },
      }}
      transition={
        muted
          ? { duration: 0.3 }
          : { type: "spring", stiffness: 500, damping: 22 }
      }
      style={{ transformOrigin: "bottom center" }}
      className="absolute bottom-[calc(100%+14px)] z-30 pointer-events-none"
    >
      {/* Gentle float while it's up */}
      <motion.div
        animate={muted ? undefined : { y: [0, -3, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Reacts to the host's verdict */}
        <motion.div
          key={bubble.verdict ?? "none"}
          animate={bubble.verdict ? verdictAnimation[bubble.verdict] : {}}
          transition={{ duration: 0.45 }}
          className={`chatBubble relative transition-colors duration-300 ${colors}`}
        >
          <span className="line-clamp-3 break-words">
            {bubble.message.slice(0, shown)}
            {/* Rest of the text keeps the bubble at its final size while typing */}
            <span className="opacity-0">{bubble.message.slice(shown)}</span>
          </span>

          {/* Tail pointing at the player */}
          <div
            className={`chatBubbleTail transition-colors duration-300 ${colors}`}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
