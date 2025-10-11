"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@chakra-ui/react/card";
import { Input } from "@chakra-ui/react/input";
import { Button } from "@chakra-ui/react/button";
import axios from "axios";
import { ERROR_MSG } from "../../lib/constants/errorMessages";
import toast from "react-hot-toast";

// Define your client URL here, or import it from your config/environment
const CLIENT_URL = process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost";
console.log(process.env.NEXT_PUBLIC_CLIENT_URL);
console.log(CLIENT_URL);

export default function Home() {
  const [lobbyCode, setLobbyCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleCreateLobby = async () => {
    setIsCreating(true);

    try {
      const response = await axios.post(`${CLIENT_URL}:3001/createLobby`, {
        headers: { "Content-Type": "application/json" },
      });

      const data = response.data;
      router.push(`/lobby/${data.lobbyId}`);
    } catch (err) {
      toast(ERROR_MSG.CREATE_LOBBY_FAIL);
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinLobby = () => {
    if (!lobbyCode.trim()) {
      toast.error(ERROR_MSG.LOBBY_CODE_REQUIRED);
      return;
    }
    router.push(`/lobby/${lobbyCode.trim().toUpperCase()}`);
  };

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <Card.Root className="w-[320px]">
          <Card.Body className="gap-2">
            <CardTitle className="mt-2">En av ti</CardTitle>
            <div className="flex flex-col gap-4 mt-4">
              <Button onClick={handleCreateLobby} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create a lobby"}
              </Button>

              <div className="flex gap-2">
                <Input
                  placeholder="Lobby code"
                  value={lobbyCode}
                  onChange={(e) => setLobbyCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleJoinLobby();
                    }
                  }}
                />
                <Button variant="outline" onClick={handleJoinLobby}>
                  Join
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card.Root>
      </main>
    </div>
  );
}
