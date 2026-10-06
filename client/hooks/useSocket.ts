import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import toast from "react-hot-toast";
import * as Shared from "@enavti/shared-types";
import { getServerUrl } from "@/lib/serverUrl";

export function useSocket(lobbyId: string, router: any) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<Shared.Player[]>([]);
  const [gameState, setGameState] = useState<Shared.GameState>(null);

  useEffect(() => {
    const newSocket = io(getServerUrl(), {
      transports: ["websocket", "polling"],
    });
    setSocket(newSocket);

    newSocket.on(
      "lobby-update",
      (data: { players: Shared.Player[]; gameState: Shared.GameState }) => {
        setPlayers(data.players);
        if (data.gameState) {
          setGameState(data.gameState);
        }
      }
    );

    newSocket.on("error", (data: { message: string }) => {
      toast.error(data.message);
      if (data.message === "Lobby not found") {
        router.push(`/`);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [lobbyId, router]);

  return { socket, players, gameState };
}
