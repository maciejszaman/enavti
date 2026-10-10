import React from "react";
import { MIN_PLAYERS } from "@/lib/gameRules";

export const Rules = () => {
  return (
    <div className="flex flex-col p-2 text-center h-full">
      <div className="text-2xl p-2">Rules</div>
      <div className="h-[2px] bg-[#27272a] mb-2"></div>

      <div className="flex flex-col gap-2 p-2 text-left overflow-y-auto">
        <p>
          At least {MIN_PLAYERS} players are needed. Everyone starts with 3
          lives. Answer by typing in the chat when it&apos;s your turn. A
          wrong answer or running out of time costs a life.
        </p>

        <p className="text-amber-300">Round one</p>
        <p>
          Every player gets 2 questions, asked in turn. Miss both and you&apos;re
          out: you stay in the lobby as a spectator.
        </p>

        <p className="text-amber-300">Round two</p>
        <p>
          The first player in order gets a question. Answer correctly and you
          choose who&apos;s next by typing their number. If the player you
          chose answers wrong, you choose again. If the first player answers
          wrong, the next player in order is asked, until someone gets it
          right. Lose all your lives and you&apos;re out.
        </p>
      </div>
    </div>
  );
};
