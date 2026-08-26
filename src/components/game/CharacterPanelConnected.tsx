"use client";

import { useGameStore } from "@/store/gameStore";
import { CharacterPanel } from "./CharacterPanel";

export default function CharacterPanelConnected() {
  const game = useGameStore((s) => s.game);
  if (!game?.character) return null;
  return <CharacterPanel state={game} />;
}
