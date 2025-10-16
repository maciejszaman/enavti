"use client";

import { Button } from "@chakra-ui/react/button";
import { Input } from "@chakra-ui/react/input";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GameView from "@/components/GameView/GameView";
import { useSocket } from "@/hooks/useSocket";
import { Copy, Forward, LoaderCircle, Power } from "lucide-react";
import { Code, Separator } from "@chakra-ui/react";
import { JoinMenu } from "@/components/JoinMenu/JoinMenu";
import { motion, useAnimation } from "framer-motion";

export default function LobbyPage() {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const params = useParams();
  const lobbyId = params.lobbyId as string;
  const router = useRouter();

  const inputControls = useAnimation();

  const { socket, players, gameState } = useSocket(lobbyId, router);

  useEffect(() => {
    if (gameState !== null) {
      setIsLoading(false);
    }
  }, [gameState]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("lobby-update-req", { lobbyId });
  }, [socket, lobbyId]);

  const handleChatInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    inputControls.start({
      scale: [1, 1.025, 1],
      transition: { duration: 0.1 },
    });
    setChatMessage(e.target.value);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/lobby/${lobbyId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveLobby = () => {
    if (socket) socket.disconnect();
    router.push(`/`);
  };

  const handleSendChat = () => {
    if (!chatMessage.trim() || !socket) return;

    socket.emit("chat-message-req", {
      lobbyId,
      playerId: socket.id,
      message: chatMessage.trim(),
    });

    setChatMessage("");
  };

  const handleStartGame = () => {
    if (!socket) return;
    if (socket.id !== players[0]?.id) return;
    socket.emit("start-game", { lobbyId });
  };

  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center w-full max-w-5xl">
        {isLoading ? (
          <div className="gameWindow relative w-full h-[500px] bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg overflow-hidden border-2 border-[#27272a]">
            <div className="gameViewContainer flex flex-col text-center justify-center items-center gap-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <LoaderCircle className="animate-spin" />
              <span>Loading</span>
            </div>
          </div>
        ) : (
          <GameView
            gameState={gameState}
            players={players}
            currentPlayerId={socket?.id}
            socket={socket}
          />
        )}

        <div className="container w-[400px] gap-4">
          <div className="text-center mb-4">
            <span className="text-nowrap jetbrains font-bold opacity-50">
              LOBBY {lobbyId}
            </span>
          </div>

          {!playerName ? (
            <JoinMenu
              socket={socket}
              players={players}
              lobbyId={lobbyId}
              setPlayerName={setPlayerName}
            />
          ) : (
            <>
              <div className="flex gap-2">
                <motion.input
                  animate={inputControls}
                  className="container border-b-2 text text-center"
                  placeholder="Type a message..."
                  value={chatMessage}
                  autoFocus
                  onChange={handleChatInput}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                />
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
                  className="container w-fit flex items-center justify-center"
                  onClick={handleSendChat}
                >
                  <Forward />
                </motion.button>
              </div>

              <div className="divider mt-4 mb-4" />

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
                onClick={handleCopyLink}
                className="container flex gap-2 justify-center items-center"
              >
                <Copy size={16} />
                {copied ? "Copied!" : "Copy Invite Link"}
              </motion.button>
              <div className="flex gap-2 mt-2">
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
                  onClick={handleLeaveLobby}
                  className="container w-full"
                >
                  Leave Lobby
                </motion.button>

                {playerName &&
                  socket?.id === players[0]?.id &&
                  gameState === "lobby" && (
                    <motion.button
                      whileTap={{
                        scale: 0.9,
                        transition: { duration: 0.1 },
                      }}
                      whileHover={{
                        scale: 1.1,
                        transition: { duration: 0.1 },
                      }}
                      onClick={handleStartGame}
                      className="container border-2 border-[#afafaf] border-b-4 bg-white text-[#111111] shadow-md shadow-white/20 w-fit whitespace-nowrap flex gap-2 justify-center items-center"
                    >
                      <Power size={16} /> Start Game
                    </motion.button>
                  )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
