import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as Shared from "@enavti/shared-types";
import * as Types from "./GameView.Types";
import { useChat } from "@/hooks/useChat";
import { useGameSounds } from "@/hooks/useGameSounds";
import {
  BookOpen,
  Info,
  MessageCircleQuestionMark,
  User,
  X,
} from "lucide-react";
import { ModalContent } from "../Modals";
import { ChatBubble } from "./ChatBubble";
import { PlayerCharacter } from "./PlayerCharacter";
import { usePlayerReactions } from "@/hooks/usePlayerReactions";
import { Rules } from "../Modals/Rules";
import { MAX_PLAYERS, MIN_PLAYERS, isMutedChat } from "@/lib/gameRules";

// Players stand on a half circle around the host, like in a TV studio.
// The outermost seats are closest to the camera and the middle ones furthest
// away, so the stage perspective alone makes the players in the back smaller.
const STAGE_PERSPECTIVE = 1000; // px
// Below 1 the camera sees past the stage sides, the players fill ~80% of the width
const CAMERA_ZOOM = 0.84;
const ARC_ANGLE = (130 * Math.PI) / 180; // how much of the circle the seats cover
const ARC_HALF_WIDTH = 43; // % of the stage, from its center to the outermost seats
const ARC_DEPTH = 250; // px from the outermost seats back to the middle of the arc

const getSeat = (index: number, playerCount: number) => {
  // Neighbours stand a fixed step apart and the group is centered, so the first
  // players gather in the middle (angle 0, at the back) and the group spreads
  // to the sides as more join. A full stage fills the whole arc.
  const seats = Math.max(playerCount, MAX_PLAYERS);
  const edge = ARC_ANGLE / 2;
  const angle = (index - (playerCount - 1) / 2) * (ARC_ANGLE / (seats - 1));
  const depth =
    ((Math.cos(angle) - Math.cos(edge)) / (1 - Math.cos(edge))) * ARC_DEPTH;
  const left = 50 + (Math.sin(angle) / Math.sin(edge)) * ARC_HALF_WIDTH;
  // Seats end up about evenly spaced on screen
  const spacing = playerCount > 1 ? (2 * ARC_HALF_WIDTH) / (seats - 1) : 100;
  // Distance to the closest side of the view, which is wider than the stage when zoomed out
  const toSide = Math.min(left, 100 - left) + 50 * (1 / CAMERA_ZOOM - 1);

  return {
    left,
    // Room for the chat bubble: up to the neighbours, and 1% clear of the side
    width: Math.min(spacing, 2 * (toSide - 1)),
    z: -depth,
    // Players in front are drawn over the ones behind them
    zIndex: Math.round(ARC_DEPTH - depth),
    // How much the perspective shrinks everything on this seat
    scale: STAGE_PERSPECTIVE / (STAGE_PERSPECTIVE + depth),
  };
};

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
  const talking = usePlayerReactions(socket);
  useGameSounds(socket, players, gameState);
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

  const [rulesOpen, setRulesOpen] = useState(false);

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

  // Rules are only available while gathering players
  useEffect(() => {
    if (gameState !== "lobby") setRulesOpen(false);
  }, [gameState]);

  useEffect(() => {
    if (!rulesOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRulesOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rulesOpen]);

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
      socket.off("announcement", handleAnnouncement);
      socket.off("timer-update", handleTimerUpdate);
      socket.off("timer-stop", handleTimerStop);
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
      <div
        className="absolute inset-0"
        style={{
          perspective: `${STAGE_PERSPECTIVE}px`,
          // Camera at head height: heads stay level, stands rise towards the back
          perspectiveOrigin: "50% 35%",
          // Zooms out around the floor, so the stands stay at the bottom
          transform: `scale(${CAMERA_ZOOM})`,
          transformOrigin: "50% 100%",
        }}
      >
        {players.map((player, index) => {
          const chatBubble = getChatBubbleForPlayer(player.id);
          const isCurrentPlayer = player.id === currentPlayerId;
          const seat = getSeat(index, players.length);

          return (
            // Centered on the seat, slides to the new one when someone joins or leaves
            <motion.div
              key={player.id}
              initial={false}
              animate={{
                left: `${seat.left}%`,
                width: `${seat.width}%`,
                z: seat.z,
              }}
              transition={{ type: "spring", duration: 0.8, bounce: 0.2 }}
              style={{ x: "-50%", zIndex: seat.zIndex }}
              className="absolute bottom-4 flex flex-col items-center"
            >
              {/* Chat bubble */}
              <AnimatePresence>
                {chatBubble && (
                  <ChatBubble
                    key={chatBubble.id}
                    bubble={chatBubble}
                    isOwn={isCurrentPlayer}
                    scale={1 / seat.scale}
                    muted={isMutedChat(
                      players,
                      gameState,
                      player.id,
                      currentPlayerId,
                    )}
                  />
                )}
              </AnimatePresence>

              {/* Character */}
              <AnimatePresence mode="wait">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    filter: player.eliminated
                      ? "brightness(0.3) grayscale(1)"
                      : "brightness(1) grayscale(0)",
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", duration: 1 }}
                  title={player.eliminated ? "Spectating" : undefined}
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
                    <PlayerCharacter
                      player={player}
                      talkCount={talking[player.id]}
                    />

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
            </motion.div>
          );
        })}
      </div>

      {/* Rules Modal */}
      <AnimatePresence>
        {rulesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setRulesOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateX: -15 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotateX: 15 }}
              transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
              className="container w-[400px] h-[400px] relative z-50"
            >
              <button
                onClick={() => setRulesOpen(false)}
                className="absolute top-3 right-3 opacity-50 hover:opacity-100"
                aria-label="Close rules"
              >
                <X size={20} />
              </button>
              <Rules />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game state */}
      {gameState === "lobby" ? (
        <div className="absolute top-4 left-4 flex gap-2">
          <div
            className="container w-fit flex gap-2"
            title={`At least ${MIN_PLAYERS} players are needed to start`}
          >
            <User />
            <span>
              {players.length}
              {players.length < MIN_PLAYERS && (
                <span className="opacity-50">/{MIN_PLAYERS}</span>
              )}
            </span>
          </div>
          <motion.button
            whileTap={{
              scale: 0.95,
              transition: { duration: 0.1 },
            }}
            whileHover={{
              scale: 1.05,
              filter: "brightness(1.5)",
              transition: { duration: 0.1 },
            }}
            onClick={() => setRulesOpen(true)}
            className="container w-fit flex items-center justify-center"
            aria-label="Show rules"
            title="Rules"
          >
            <BookOpen />
          </motion.button>
        </div>
      ) : null}
    </div>
  );
}
