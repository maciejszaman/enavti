"use client";

import { Button } from "@chakra-ui/react/button";
import { Card, CardDescription, CardTitle } from "@chakra-ui/react/card";
import { Input } from "@chakra-ui/react/input";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { ERROR_MSG } from "../../../../lib/constants/errorMessages";
import toast from "react-hot-toast";
import * as Shared from "../../../../lib/types/Shared.types";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function LobbyPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<Shared.Player[]>([]);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");
  const [copied, setCopied] = useState(false);

  const params = useParams();
  const lobbyId = params.lobbyId as string;
  const router = useRouter();

  useEffect(() => {
    const newSocket = io("http://localhost:3001", {
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

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
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
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">
                      Players ({players.length})
                    </h3>
                  </div>

                  <div className="flex flex-col gap-2">
                    {players.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Waiting for players...
                      </p>
                    ) : (
                      players.map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center gap-2 p-2 bg-muted rounded-md"
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-sm">{player.name}</span>
                        </div>
                      ))
                    )}
                  </div>
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
