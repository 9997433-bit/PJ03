"use client";

import { useState } from "react";
import { FREE_POINTS, ATTR_CAP } from "@/engine/stubEngine";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

const BASE = 5;
const KEYS = ["genGu", "wuXing", "xinXing", "qiYun"] as const;
const LABELS: Record<(typeof KEYS)[number], string> = {
  genGu: "根骨",
  wuXing: "悟性",
  xinXing: "心性",
  qiYun: "气运",
};

export function AttributeStep() {
  const allocate = useGameStore((s) => s.creationAllocate);
  const [vals, setVals] = useState({ genGu: BASE, wuXing: BASE, xinXing: BASE, qiYun: BASE });

  const spent = KEYS.reduce((n, k) => n + (vals[k] - BASE), 0);
  const left = FREE_POINTS - spent;

  const bump = (key: (typeof KEYS)[number], d: number) => {
    setVals((v) => {
      const next = { ...v, [key]: v[key] + d };
      if (next[key] < BASE || next[key] > ATTR_CAP) return v;
      const s = KEYS.reduce((n, k) => n + (next[k] - BASE), 0);
      if (s > FREE_POINTS) return v;
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <p className="text-center text-sm text-mist-400">自由点数 {left}/{FREE_POINTS}</p>
      {KEYS.map((k) => (
        <div key={k} className="flex items-center justify-between">
          <span>{LABELS[k]}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => bump(k, -1)}>−</Button>
            <span className="w-8 text-center font-mono">{vals[k]}</span>
            <Button size="sm" variant="outline" onClick={() => bump(k, 1)}>+</Button>
          </div>
        </div>
      ))}
      <Button disabled={left !== 0} className="w-full" onClick={() => allocate(vals)}>
        定格命格
      </Button>
    </div>
  );
}

export default AttributeStep;
