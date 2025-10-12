import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as Shared from "../../../lib/types/Shared.types";
import * as Types from "./GameView.Types";
import { useChat } from "@/hooks/useChat";
import { Info, User } from "lucide-react";
import { ModalContent } from "../Modals";

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
  const [modal, setModal] = useState<Shared.Modal>({ open: false, type: null });

  useEffect(() => {
    if (!socket) return;

    const handleAnnouncement = (announcement: Shared.Announcement) => {
      console.log(announcement);
      if (announcement.type === "info") {
        setAnnouncement(announcement);
        setTimeout(() => setAnnouncement(null), 5000);
      }
      if (announcement.type === "modal") {
        if (modal.open) return;
        setModal({
          open: true,
          type: announcement.message as Shared.ModalType,
        });
      }
      if (announcement.type === "closeModal") {
        setModal({
          open: false,
          type: "shufflingPlayers",
        });
      }
    };

    socket.on("announcement", handleAnnouncement);

    return () => {
      socket.off("announcement");
    };
  }, [socket]);

  return (
    <div className="gameWindow relative w-full h-[500px] bg-[#8572ab] rounded-lg overflow-hidden border-2 border-[#27272a]">
      {/* Announcement */}
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

      {/* Modal */}
      <AnimatePresence>
        {modal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            {/* Blurred backdrop */}
            <div className="absolute inset-0 bg-black" />

            {/* Modal content - Quiz show style */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateX: -15 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotateX: 15 }}
              transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
              className="gameViewContainer w-[400px] h-[400px] relative z-50 pointer-events-auto"
            >
              <ModalContent type={modal.type} data={{ players }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Players */}
      <div className="absolute bottom-4 left-0 right-0 flex items-end justify-center gap-8 px-8">
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
                    {/* Name */}
                    <div className="gameViewContainer rounded-xl">
                      {player.name}
                    </div>

                    {/* CharacterRender */}
                    <img
                      src={
                        player.character
                          ? `/${player.character}`
                          : index % 2 === 0
                          ? "/maciej.svg"
                          : "/kuba.svg"
                      }
                      alt="Player"
                      className="playerCharacterImg z-20 object-contain"
                    />
                    <div className="h-8 w-32 absolute bottom-[15px] z-0 rounded-2xl bg-black/10"></div>
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
        {gameState === "lobby" ? (
          <>
            <User />
            <span className="text-sm p-4 text-white">{players.length}</span>
          </>
        ) : (
          gameState
        )}
      </div>
    </div>
  );
}
