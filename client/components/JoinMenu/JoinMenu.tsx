import { Button } from "@chakra-ui/react/button";
import { Input } from "@chakra-ui/react/input";
import React, { useEffect, useState } from "react";
import * as Types from "./JoinMenu.types";
import toast from "react-hot-toast";
import { ERROR_MSG } from "../../../lib/constants/errorMessages";
import { Slider } from "@chakra-ui/react/slider";

export const JoinMenu = ({
  socket,
  lobbyId,
  setPlayerName,
  players,
}: Types.JoinMenuProps) => {
  const defaultCharacter = (players.length % 4) + 1;
  const [tempName, setTempName] = useState("");

  const [characterSelect, setCharacterselect] = useState({
    character: defaultCharacter,
    clothesColor: 1,
  });

  console.log(characterSelect);
  console.log(defaultCharacter);

  useEffect(() => {
    setCharacterselect((prev) => ({
      ...prev,
      character: defaultCharacter,
    }));
  }, [defaultCharacter]);

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
      <p className="text-sm text-muted-foreground">
        Enter your name to join the lobby:
      </p>
      <Input
        autoFocus
        maxLength={12}
        placeholder="Your name"
        value={tempName}
        onChange={(e) => setTempName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSetName()}
      />
      <Button onClick={handleSetName}>Join</Button>

      <p className="text-sm text-muted-foreground">Customize your character:</p>
      <div className="flex gap-2">
        <div className="flex flex-col gap-4 w-1/2">
          <Slider.Root
            width="full"
            min={1}
            max={4}
            step={1}
            value={[characterSelect.character]}
            onValueChange={(e) => handleSlider(e.value, "base")}
          >
            <Slider.Label>Base</Slider.Label>
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumbs />
            </Slider.Control>
          </Slider.Root>
          <Slider.Root
            width="full"
            min={1}
            max={4}
            step={1}
            onValueChange={(e) => handleSlider(e.value, "clothes")}
          >
            <Slider.Label>Clothes</Slider.Label>
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumbs />
            </Slider.Control>
          </Slider.Root>
        </div>
        <div className="w-1/2 border-2 gameViewContainer">
          <img
            src={`/svg${characterSelect.character}v${characterSelect.clothesColor}.svg`}
            alt="character preview"
          />
        </div>
      </div>
    </div>
  );
};
