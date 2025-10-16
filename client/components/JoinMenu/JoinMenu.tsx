import React, { useEffect, useState } from "react";
import * as Types from "./JoinMenu.types";
import toast from "react-hot-toast";
import { ERROR_MSG } from "../../../lib/constants/errorMessages";
import { motion, useAnimation } from "framer-motion";

export const JoinMenu = ({
  socket,
  lobbyId,
  setPlayerName,
  players,
}: Types.JoinMenuProps) => {
  const [tempName, setTempName] = useState("");

  const inputControls = useAnimation();
  const defaultCharacter = (players.length % 4) + 1;

  const [characterSelect, setCharacterselect] = useState({
    character: defaultCharacter,
    clothesColor: 1,
  });

  useEffect(() => {
    setCharacterselect((prev) => ({
      ...prev,
      character: defaultCharacter,
    }));
  }, [defaultCharacter]);

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    inputControls.start({
      scale: [1, 1.025, 1],
      transition: { duration: 0.1 },
    });
    setTempName(e.target.value);
  };

  const handleSetName = () => {
    if (!tempName.trim() || !socket) {
      toast.error(ERROR_MSG.NAME_REQUIRED);
      return;
    }
    setPlayerName(tempName.trim());
    socket.emit("join-lobby", {
      lobbyId,
      playerName: tempName.trim(),
      character: {
        character: characterSelect.character,
        clothesColor: characterSelect.clothesColor,
      },
    });
  };

  const handleSlider = (value: number[], type: string): void => {
    if (type === "base") {
      setCharacterselect((prev) => ({ ...prev, character: value[0] }));
    }
    if (type === "clothes") {
      setCharacterselect((prev) => ({ ...prev, clothesColor: value[0] }));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="divider mt-2"></div>
      <p className="text-sm">Enter your name to join the lobby:</p>
      <div className="flex gap-2">
        <motion.input
          autoFocus
          maxLength={12}
          animate={inputControls}
          className="container border-b-2 text text-center w-full"
          placeholder="Your name"
          value={tempName}
          onChange={handleNameInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSetName();
            }
          }}
        />
        <motion.button
          className="container font-bold bg-white text-[#111111] border-2 border-[#afafaf] border-b-4 w-1/3"
          whileTap={{
            scale: 0.95,
            transition: { duration: 0.1 },
          }}
          whileHover={{
            scale: 1.05,
            transition: { duration: 0.1 },
          }}
          onClick={handleSetName}
        >
          Join
        </motion.button>
      </div>

      <div className="divider h-[2px] mt-2 mb-2"></div>

      <div className="flex gap-2">
        <div className="flex flex-col mt-4 gap-4 w-1/2">
          <p className="text-sm text-muted-foreground text-center">
            Customize:
          </p>
          <label>Base</label>
          <input
            type="range"
            min={1}
            max={4}
            value={characterSelect.character}
            onChange={(e) => handleSlider([Number(e.target.value)], "base")}
            className="accent-[#afafaf]"
          />
          <label>Clothes</label>
          <input
            type="range"
            min={1}
            max={4}
            value={characterSelect.clothesColor}
            className="accent-[#afafaf]"
            onChange={(e) => handleSlider([Number(e.target.value)], "clothes")}
          />
        </div>
        <div className="w-1/2 border-2 container bg-gradient-to-t from-sky-300/30">
          <img
            src={`/svg${characterSelect.character}v${characterSelect.clothesColor}.svg`}
            alt="character preview"
          />
        </div>
      </div>
    </div>
  );
};
