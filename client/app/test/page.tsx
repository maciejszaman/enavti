"use client";
import { Copy, Forward, Power } from "lucide-react";
import { useEffect, useState } from "react";

export default function Test() {
  const [copied, setCopied] = useState(false);
  const lobbyId = "69QTAS";

  const handleCopyLink = () => {
    const link = `${window.location.origin}/lobby/${lobbyId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center w-full max-w-5xl">
        <div className="container w-[400px] gap-4">
          <div className="text-center mb-4">
            <span className="text-nowrap jetbrains font-bold opacity-50">
              LOBBY {lobbyId}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              className="container border-b-2 text text-center"
              placeholder="Type a message..."
            />
            <button className="container w-fit flex items-center justify-center">
              <Forward />
            </button>
          </div>

          <div className="divider mt-4 mb-4" />

          <button
            onClick={handleCopyLink}
            className="container flex gap-2 justify-center items-center"
          >
            <Copy size={16} />
            {copied ? "Copied!" : "Copy Invite Link"}
          </button>
          <div className="flex gap-2 mt-2">
            <button className="container w-full">Leave Lobby</button>
            <button className="container border-2 border-[#afafaf] border-b-4 bg-white text-[#111111] shadow-md shadow-white/20 w-fit whitespace-nowrap flex gap-2 justify-center items-center">
              <Power size={16} /> Start Game
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
