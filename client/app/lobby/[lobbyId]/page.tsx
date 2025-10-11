"use client";

import { Button } from "@chakra-ui/react/button";
import { Card, CardDescription, CardTitle } from "@chakra-ui/react/card";
import { Input } from "@chakra-ui/react/input";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { ERROR_MSG } from "../../../../lib/constants/errorMessages";
import toast from "react-hot-toast";
import * as Shared from "../../../../lib/types/Shared.types";
import { useRouter } from "next/navigation";

import GameView from "@/components/GameView/GameView";

// Define CLIENT_URL for socket connection
const CLIENT_URL = process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost";

export default function LobbyPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<Shared.Player[]>([]);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");
  const [copied, setCopied] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Shared.ChatMessage[]>([]);

  const params = useParams();
  const lobbyId = params.lobbyId as string;
  const router = useRouter();

  useEffect(() => {
    const newSocket = io(`${CLIENT_URL}:3001`, {
      transports: ["websocket", "polling"],
    });
    setSocket(newSocket);

    newSocket.on("lobby-update", (data: { players: Shared.Player[] }) => {
      setPlayers(data.players);
    });

    newSocket.on("error", (data: { message: string }) => {
      toast.error(data.message);
      if (data.message === "Lobby not found") {
        router.push(`/`);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [lobbyId]);

  const handleSetName = () => {
    if (!tempName.trim() || !socket) {
      toast.error(ERROR_MSG.NAME_REQUIRED);
      return;
    }
    setPlayerName(tempName.trim());
    socket.emit("join-lobby", { lobbyId, playerName: tempName.trim() });
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

  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center w-full max-w-5xl">
        {playerName && (
          <GameView
            players={players}
            currentPlayerId={socket?.id}
            chatMessages={chatMessages}
            socket={socket}
          />
        )}

        <Card.Root className="w-[400px]">
          <Card.Body className="gap-4">
            <div>
              <CardTitle className="mt-2">Lobby: {lobbyId}</CardTitle>
              <CardDescription className="mt-1">
                Share this code
              </CardDescription>
            </div>

            {!playerName ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Enter your name to join the lobby:
                </p>
                <Input
                  placeholder="Your name"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSetName()}
                />
                <Button onClick={handleSetName}>Join</Button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  />
                  <Button onClick={handleSendChat} variant="outline">
                    Send
                  </Button>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button onClick={handleCopyLink} variant="outline">
                    {copied ? "Copied!" : "Copy Invite Link"}
                  </Button>
                  <Button onClick={handleLeaveLobby} variant="ghost">
                    Leave Lobby
                  </Button>
                </div>
              </>
            )}
          </Card.Body>
        </Card.Root>
      </main>
    </div>
  );
}
