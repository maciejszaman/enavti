"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ERROR_MSG } from "../../lib/constants/errorMessages";
import toast from "react-hot-toast";
import { Forward } from "lucide-react";
import { motion, useAnimation } from "framer-motion";

const CLIENT_URL = process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost";

export default function Home() {
  const [lobbyCode, setLobbyCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const controls = useAnimation();

  const handleLobbyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    controls.start({
      scale: [1, 1.05, 1],
      transition: { duration: 0.1 },
    });
    setLobbyCode(e.target.value);
  };

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
        <div className="text-center container w-[320px]">
          <div className="flex h-36 justify-center w-full p-0">
            <div className="p-1 w-[180px] relative">
              <img
                src="/svg1v1.svg"
                className="absolute left-1/2 -translate-x-[100%] h-28"
              />
              <img
                src="/svg2v1.svg"
                className="absolute left-1/2 -translate-x-1/2 h-28"
              />
              <img
                src="/svg3v1.svg"
                className="absolute left-1/2 -translate-x-[50% + 30px] h-28"
              />
              <div
                className="container bg-sky-700 w-[160px] py-1 px-3
              absolute bottom-3 left-1/2 -translate-x-1/2 "
              >
                <p className="text-xl text-amber-300 font-bold">EN AV TI</p>
                <p className="text-sm text-amber-400">online gameshow</p>
              </div>
            </div>
          </div>
          <div className="divider"></div>
          <div className="flex items-center flex-col gap-4 mt-4">
            <motion.button
              whileTap={{
                scale: 0.95,
                transition: { duration: 0.1 },
              }}
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.1 },
              }}
              className="container font-bold bg-white text-[#111111] border-2 border-[#afafaf] border-b-4 w-full"
              onClick={handleCreateLobby}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create a lobby"}
            </motion.button>

            <div className="flex gap-2">
              <motion.input
                animate={controls}
                className="container border-b-2 text jetbrains text-center"
                placeholder="Lobby code"
                value={lobbyCode}
                maxLength={6}
                onChange={handleLobbyInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleJoinLobby();
                  }
                }}
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
                className="container font-semibold flex gap-2 justify-center items-center"
                onClick={handleJoinLobby}
              >
                Join
                <Forward size={16} />
              </motion.button>
            </div>
          </div>
          <div className="divider mt-4"></div>
          <a
            href="www.github.com/maciejszaman"
            className="hover:brightness-150 transition-all ease-in-out duration-200"
          >
            <p className="text-xs text-[#27272a] jetbrains tracking-widest pt-4 pb-2 py-10 hover:scale-125  transition-all ease-in-out duration-200">
              MACIEJSZAMAN
            </p>
          </a>
        </div>
      </main>
    </div>
  );
}
