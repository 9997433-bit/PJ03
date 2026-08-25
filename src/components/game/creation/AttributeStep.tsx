"use client";

import { useMemo, useState } from "react";
import { ATTR_CAP, FREE_POINTS } from "@/engine/stubEngine";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

const KEYS = ["genGu", "wuXing", "xinXing", "qiYun"] as const;
const LABELS: Record<(typeof KEYS)[number], string> = {
  genGu: "根骨",
  wuXing: "悟性",
  xinXing: "心性",
  qiYun: "气运",
};

export function AttributeStep() {
  const game = useGameStore((s) => s.game);
  const allocate = useGameStore((s) => s.creationAllocate);
  const base = game?.character?.attributes;

  const initial = useMemo(
    () =>
      base
        ? { genGu: base.genGu, wuXing: base.wuXing, xinXing: base.xinXing, qiYun: base.qiYun }
        : { genGu: 5, wuXing: 5, xinXing: 5, qiYun: 5 },
    [base],
  );

  const [vals, setVals] = useState(initial);

  if (!base) return null;

  const spent = KEYS.reduce((n, k) => n + (vals[k] - base[k]), 0);
  const left = FREE_POINTS - spent;

  const bump = (key: (typeof KEYS)[number], d: number) => {
    setVals((v) => {
      const next = { ...v, [key]: v[key] + d };
      if (next[key] < base[key] || next[key] > ATTR_CAP) return v;
      const s = KEYS.reduce((n, k) => n + (next[k] - base[k]), 0);
      if (s > FREE_POINTS) return v;
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <p className="text-center text-sm text-mist-400">
        自由点数 {left}/{FREE_POINTS}
        <span className="mt-1 block text-xs text-paper-500">出身已计入根骨/心性等基础值</span>
      </p>
      {KEYS.map((k) => (
        <div key={k} className="flex items-center justify-between">
          <span>
            {LABELS[k]} <span className="text-xs text-paper-500">(底{base[k]})</span>
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => bump(k, -1)} disabled={vals[k] <= base[k]}>
              −
            </Button>
            <span className="w-8 text-center font-mono">{vals[k]}</span>
            <Button size="sm" variant="outline" onClick={() => bump(k, 1)} disabled={vals[k] >= ATTR_CAP || left <= 0}>
              +
            </Button>
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
