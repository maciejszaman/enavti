import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as Shared from "../../../lib/types/Shared.types";
import * as Types from "./GameView.Types";
import { useChat } from "@/hooks/useChat";
import { Box, Button, Text } from "@chakra-ui/react";
import { Info, User } from "lucide-react";

export default function GameView({
  players,
  currentPlayerId,
  socket,
  gameState,
}: Types.GameViewProps) {
  const { getChatBubbleForPlayer } = useChat(socket);
  const [announcement, setAnnouncement] = useState<Shared.Announcement | null>(
    null
  );

  useEffect(() => {
    if (!socket) return;

    const handleAnnouncement = (announcement: Shared.Announcement) => {
      console.log(announcement);
      setAnnouncement(announcement);
      setTimeout(() => setAnnouncement(null), 5000);
    };

    socket.on("announcement", handleAnnouncement);

    return () => {
      socket.off("announcement");
    };
  }, [socket]);

  return (
    <div className="gameWindow relative w-full h-[500px] bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg overflow-hidden border-2 border-[#27272a]">
      <AnimatePresence>
        {announcement && (
          <motion.div
            key={announcement.type}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3, type: "spring" }}
            className="absolute top-10 w-full rounded-xl flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="gameViewContainer flex gap-2">
              <Info />
              <span>{announcement.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Players */}
      <div className="absolute bottom-32 left-0 right-0 flex items-end justify-center gap-8 px-8">
        {players.map((player, index) => {
          const chatBubble = getChatBubbleForPlayer(player.id);
          const isCurrentPlayer = player.id === currentPlayerId;

          return (
            <div
              key={player.id}
              className="relative flex flex-col items-center"
            >
              {/* Chat bubble */}
              <AnimatePresence>
                {chatBubble && (
                  <motion.div
                    key={chatBubble.timestamp}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30, scale: 0.1 }}
                    transition={{ duration: 0.2 }}
                    className="chatBubble absolute bottom-[calc(100%+10px)] left-1/2 transform -translate-x-1/2 bg-white rounded-lg overflow-hidden z-20"
                  >
                    <div className=" text-black font-medium">
                      {chatBubble.message}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Character */}
              <AnimatePresence mode="wait">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", duration: 0.5 }}
                >
                  <div className="character gap-2 relative flex flex-col items-center">
                    <img
                      src={`/img${index + 1}.jpg`}
                      alt="Player"
                      className="playerCharacterImg w-16 h-16 aspect-square rounded-[100%]"
                    />
                    {/* Name */}
                    <div className="gameViewContainer rounded-xl">
                      {player.name}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Lives temporary */}
              {/* <div className="mt-1 bg-gray-800/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  <span className="text-xs font-mono text-white">0</span>
                </div> */}
            </div>
          );
        })}
      </div>
      {/* Game state */}
      <div className="gameViewContainer absolute top-4 left-4 bg-black/30 rounded-lg flex gap-2">
        {gameState.stage === "lobby" ? (
          <>
            <User />
            <span className="text-sm p-4 text-white">{players.length}</span>
          </>
        ) : (
          gameState.stage
        )}
      </div>
    </div>
  );
}
