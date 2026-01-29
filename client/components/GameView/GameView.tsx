import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as Shared from "@enavti/shared-types";
import * as Types from "./GameView.Types";
import { useChat } from "@/hooks/useChat";
import { Info, MessageCircleQuestionMark, User } from "lucide-react";
import { ModalContent } from "../Modals";

const getBackgroundImage = (gameState: Shared.GameState): string => {
  switch (gameState) {
    case "lobby":
      return "/bg-green.webp";
    case "roundOne":
      return "/bg-blue.webp";
    case "roundTwo":
      return "/bg-purple.webp";
    case "roundThree":
      return "/bg-orange.webp";
    default:
      return "/bg-blue.webp";
  }
};

export default function GameView({
  players,
  currentPlayerId,
  socket,
  gameState,
}: Types.GameViewProps) {
  const { getChatBubbleForPlayer } = useChat(socket);
  const backgroundImage = useMemo(
    () => getBackgroundImage(gameState),
    [gameState],
  );
  const [announcement, setAnnouncement] = useState<{
    data: Shared.Announcement;
    open: boolean;
  } | null>(null);
  const [modal, setModal] = useState<Shared.Modal>({
    open: false,
    header: null,
  });
  const [timer, setTimer] = useState<{
    timeRemaining: number;
    totalTime: number;
    targetPlayer: string;
  } | null>(null);

  const announcementTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentPlayer = players.find((p) => p.id === currentPlayerId);

    if (!currentPlayer) {
      document.title = "ENAVTI";
      return;
    }

    switch (gameState) {
      case "lobby":
        document.title = `${currentPlayer.name} - ${players.length}/10`;
        break;
      case "roundOne":
      case "roundTwo":
      case "roundThree":
        break;
      default:
        document.title = "ENAVTI";
    }
  }, [gameState, players, currentPlayerId]);

  useEffect(() => {
    if (!socket) return;

    const handleAnnouncement = (announcementData: Shared.Announcement) => {
      if (announcementData.type === "modal") {
        setModal({
          open: true,
          header: announcementData.message as Shared.ModalType,
        });
      } else if (announcementData.type === "closeModal") {
        setModal({
          open: false,
          header: null,
        });
      } else {
        if (announcementTimeoutRef.current) {
          clearTimeout(announcementTimeoutRef.current);
        }

        setAnnouncement({ data: announcementData, open: true });

        const duration = announcementData.duration;
        announcementTimeoutRef.current = setTimeout(() => {
          setAnnouncement((prev) => (prev ? { ...prev, open: false } : null));
          announcementTimeoutRef.current = null;
        }, duration);
      }
    };

    const handleTimerUpdate = (timerData: Shared.TimerUpdate) => {
      setTimer(timerData);
    };

    const handleTimerStop = () => {
      setTimer(null);
    };

    socket.on("announcement", handleAnnouncement);
    socket.on("timer-update", handleTimerUpdate);
    socket.on("timer-stop", handleTimerStop);

    return () => {
      socket.off("announcement");
      socket.off("timer-update");
      socket.off("timer-stop");
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, [socket]);

  return (
    <div
      className="relative w-full h-[500px] bg-cover rounded-lg overflow-hidden border-2 border-[#27272a]"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Timer Bar*/}
      <AnimatePresence>
        {timer &&
          timer.targetPlayer === currentPlayerId &&
          timer.totalTime > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 left-0 right-0 h-2 z-50 pointer-events-none"
            >
              <div className="relative w-full h-full bg-white/10">
                <motion.div
                  className="h-full transition-all duration-100 ease-linear"
                  style={{
                    width: `${(timer.timeRemaining / timer.totalTime) * 100}%`,
                    backgroundColor:
                      timer.timeRemaining > 1000
                        ? "#ffffff"
                        : timer.timeRemaining > 250
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                />
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Announcement */}
      <AnimatePresence>
        {announcement?.open && (
          <motion.div
            key={announcement.data.type}
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -50, x: "-50%" }}
            transition={{ duration: 0.3, type: "spring" }}
            className="container px-0 py-0 w-fit absolute top-4 left-1/2 rounded-xl flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="flex flex-col gap-0 overflow-hidden">
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
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
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
              className="container w-[400px] h-[400px] relative z-50 pointer-events-auto"
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
                    className="chatBubble absolute bottom-[calc(100%+10px)] max-h-20 overflow-hidden"
                  >
                    <span className="text-black">{chatBubble.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Character */}
              <AnimatePresence mode="wait">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", duration: 1 }}
                >
                  <div className="gap-2 relative flex flex-col items-center">
                    {/* Name
                    <div
                      className={`gameViewContainer rounded-xl ${
                        isCurrentPlayer ? "yourPlayerBorder" : ""
                      } ${
                        announcement?.data.targetPlayer === player.id
                          ? "targetPlayerName"
                          : "notTargetPlayerName"
                      }
                      }`}
                    >
                      {player.name}
                    </div> */}
                    {/* CharacterRender */}
                    <img
                      src={`/svg${player.character?.character}v${player.character?.clothesColor}.svg`}
                      alt="Player"
                      className="playerCharacterImg z-20 object-contain"
                    />
                    <div className="h-8 w-32 absolute bottom-0 translate-y-2.5 z-0 rounded-2xl bg-black/20"></div>

                    {/* STAND */}
                    <div className="absolute bottom-0 z-30 flex flex-col items-center">
                      <div
                        className={`w-[80px] h-[60px] border-[3px] border-gray-800 font-bold text-center jetbrains whitespace-nowrap  flex flex-col justify-around ${
                          socket?.id === player.id ? "text-amber-300" : ""
                        } ${
                          announcement?.data.targetPlayer === player.id
                            ? "bg-purple-800 targetScreen"
                            : "bg-sky-700"
                        }`}
                      >
                        <div className="lives flex justify-center gap-2">
                          {[...Array(player.lives)].map((_, index) => (
                            <div key={index} className="h-2 w-2 bg-amber-300" />
                          ))}
                        </div>
                        <span className="text-[0.65rem]">
                          {player.name.toUpperCase()}
                        </span>
                        <span className="text-xl leading-5">{index + 1}</span>
                      </div>
                      {/* </div> */}
                      <div className="w-[60px] font-[--font-jetbrains] h-[80px] bg-gradient-to-t from-gray-500 to-gray-800 flex justify-around">
                        {[...Array(player.lives)].map((_, index) => (
                          <div
                            key={index}
                            className="h-full w-1 bg-gradient-to-t from-emerald-300 to-amber-300"
                          ></div>
                        ))}
                      </div>
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
      {gameState === "lobby" ? (
        <div className="container w-fit absolute top-4 left-4 flex gap-2">
          <>
            <User />
            <span>{players.length}</span>
          </>
        </div>
      ) : null}
    </div>
  );
}
