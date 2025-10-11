import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as Shared from "../../../lib/types/Shared.types";
import * as Types from "./GameView.Types";

export default function GameView({
  players,
  currentPlayerId,
  socket,
}: Types.GameViewProps) {
  const [chatMessages, setChatMessages] = useState<Shared.ChatMessage[]>([]);

  useEffect(() => {
    const handleChat = (chatEntry: Shared.ChatMessage) => {
      const newMsg: Shared.ChatMessage = {
        playerId: chatEntry.playerId,
        playerName: chatEntry.playerName,
        message: chatEntry.message,
        timestamp: Date.now(),
        visible: true,
      };
      setChatMessages((prev) => [...prev, newMsg]);
    };

    socket?.on("chat-message-broadcast", handleChat);

    return () => {
      socket?.off("chat-message-broadcast", handleChat);
    };
  }, [socket]);

  useEffect(() => {
    const updateVisible = () => {
      setChatMessages((msgs) =>
        msgs.map((msg) =>
          Date.now() - msg.timestamp > 2000 ? { ...msg, visible: false } : msg
        )
      );
    };

    updateVisible();

    const interval = setInterval(updateVisible, 500);
    return () => clearInterval(interval);
  }, [setChatMessages]);

  const getChatBubbleForPlayer = (playerId: string) => {
    return chatMessages
      .filter((msg) => msg.playerId === playerId && msg.visible)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
  };

  return (
    <div className="relative w-full h-[500px] bg-gradient-to-b from-purple-900 to-blue-950 rounded-lg overflow-hidden shadow-2xl">
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
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.4 }}
                    className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-white rounded-lg p-8 shadow-lg w-fit overflow-hidden text-ellipsis"
                  >
                    <div className=" text-black font-medium">
                      {chatBubble.message}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="character gap-2 relative flex flex-col items-center">
                {/* Name */}
                <div className="playerCharacterName bg-black text-white">
                  {player.name}
                </div>

                {/* Character */}
                <img
                  src={`/img${index + 1}.jpg`}
                  alt="Player"
                  className="playerCharacterImg w-16 h-16 aspect-square rounded-[100%]"
                />

                {/* Lives temporary */}
                <div className="mt-1 bg-gray-800/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  <span className="text-xs font-mono text-white">0</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Player count */}
      <div className="playerCount absolute top-4 left-4 bg-black/30 backdrop-blur-sm rounded-sm shadow-lg">
        <span className="text-sm p-4 text-white">
          {players.length} {players.length === 1 ? "Player" : "Players"}
        </span>
      </div>
    </div>
  );
}
