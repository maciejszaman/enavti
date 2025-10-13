import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as Shared from "../../../lib/types/Shared.types";
import * as Types from "./GameView.Types";
import { useChat } from "@/hooks/useChat";
import { Info, MessageCircleQuestionMark, User } from "lucide-react";
import { Progress } from "@chakra-ui/react";
import { ModalContent } from "../Modals";

export default function GameView({
  players,
  currentPlayerId,
  socket,
  gameState,
}: Types.GameViewProps) {
  const { getChatBubbleForPlayer } = useChat(socket);
  const [announcement, setAnnouncement] = useState<{
    data: Shared.Announcement;
    duration: number;
  } | null>(null);
  const [modal, setModal] = useState<Shared.Modal>({
    open: false,
    header: null,
  });

  useEffect(() => {
    if (!socket) return;

    const handleAnnouncement = (announcementData: Shared.Announcement) => {
      console.log(announcementData);
      if (announcementData.type === "info") {
        const duration = 5000;
        setAnnouncement({ data: announcementData, duration });
        setTimeout(() => setAnnouncement(null), duration);
      }
      if (announcementData.type === "question") {
        const messageWords = announcementData.message.split(" ");
        const duration = messageWords.length * 600 + 1000;
        console.log(messageWords);
        console.log(duration);
        setAnnouncement({ data: announcementData, duration });
        setTimeout(() => setAnnouncement(null), duration);
      }
      if (announcementData.type === "game-start") {
        const duration = 3000;
        setAnnouncement({ data: announcementData, duration });
        setTimeout(() => setAnnouncement(null), duration);
      }
      if (announcementData.type === "modal") {
        setModal({
          open: true,
          header: announcementData.message as Shared.ModalType,
        });
      }
      if (announcementData.type === "closeModal") {
        setModal({
          open: false,
          header: null,
        });
      }
    };

    socket.on("announcement", handleAnnouncement);

    return () => {
      socket.off("announcement");
    };
  }, [socket]);

  return (
    <div className="gameWindow relative w-full h-[500px] bg-[url(/background.webp)] bg-cover rounded-lg overflow-hidden border-2 border-[#27272a]">
      {/* Announcement */}
      <AnimatePresence>
        {announcement && (
          <motion.div
            key={announcement.data.type}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3, type: "spring" }}
            className="absolute top-10 w-full rounded-xl flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="gameViewContainer flex flex-col gap-0 overflow-hidden">
              <div className="flex gap-2 p-4">
                {announcement.data.type === "question" ? (
                  <MessageCircleQuestionMark />
                ) : (
                  <Info />
                )}
                <span>{announcement.data.message}</span>
              </div>
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
              transition={{
                duration: 0.5,
                type: "spring",
                bounce: 0.3,
                delay: 0.5,
              }}
              className="gameViewContainer w-[400px] h-[400px] relative z-50 pointer-events-auto"
            >
              <ModalContent header={modal.header} data={{ players }} />
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
                    className="chatBubble absolute bottom-[calc(100%+10px)] left-1/2 transform -translate-x-1/2 bg-white rounded-lg overflow-hidden"
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
                      src={`/svg${index + 1}.svg`}
                      alt="Player"
                      className="playerCharacterImg z-20 object-contain"
                    />
                    <div className="h-8 w-32 absolute bottom-0 translate-y-2.5 z-0 rounded-2xl bg-black/20"></div>
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
