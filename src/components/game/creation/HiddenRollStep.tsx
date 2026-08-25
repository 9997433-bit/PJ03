"use client";

import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

export function HiddenRollStep() {
  const finish = useGameStore((s) => s.creationFinish);

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="rounded border border-gold-600/40 bg-ink-900/80 px-16 py-12 text-center">
        <p className="font-display text-4xl text-gold-300">封</p>
        <p className="mt-4 text-sm text-mist-400">天机暗掷 · 汝永不得见</p>
      </div>
      <Button onClick={finish} className="px-10">
        揭签入世
      </Button>
    </div>
  );
}

export default HiddenRollStep;
