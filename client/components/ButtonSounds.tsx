"use client";

import { useEffect } from "react";
import { playSound } from "@/lib/sound";

// Plays a click sound for every button in the app.
// Add data-sound="off" to a button (or a parent) to silence it.
export function ButtonSounds() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button || button.disabled) return;
      if (button.closest('[data-sound="off"]')) return;

      playSound("button");
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
