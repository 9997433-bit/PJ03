"use client";

import { useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { DiceRoll } from "../DiceRoll";
import { Button } from "@/components/ui/button";

export function SpiritRootStep() {
  const roll = useGameStore((s) => s.creationRollRoot);
  const root = useGameStore((s) => s.game?.character?.spiritRoot);
  const [done, setDone] = useState(!!root?.rollValue);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <p className="max-w-md text-center font-serif leading-8 text-paper-200/90">
        掌贴测灵碑，灵光一瞬，灵根定矣。天道掷签，不容重抽。
      </p>
      {done && root ? (
        <>
          <DiceRoll value={root.rollValue} reason="灵根抽取" animate={false} />
          <p className="font-display text-2xl text-gold-300">
            {root.grade} · {root.elements.join("")}
          </p>
        </>
      ) : (
        <Button
          onClick={() => {
            const r = roll();
            if (r) setDone(true);
          }}
        >
          触碑测灵
        </Button>
      )}
    </div>
  );
}

export default SpiritRootStep;
