"use client";

import { useState } from "react";
import { ORIGINS } from "@/data/origins";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function OriginStep() {
  const choose = useGameStore((s) => s.creationChoose);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"男" | "女">("男");
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="道号"
          maxLength={6}
          className="h-11 flex-1 rounded border border-ink-700 bg-ink-950 px-4 text-center font-serif tracking-widest"
        />
        <div className="flex gap-2">
          {(["男", "女"] as const).map((g) => (
            <Button key={g} variant={gender === g ? "default" : "outline"} onClick={() => setGender(g)}>
              {g}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ORIGINS.map((o) => (
          <Card
            key={o.id}
            className={`cursor-pointer border ${picked === o.id ? "border-gold-500/60" : "border-ink-700"}`}
            onClick={() => setPicked(o.id)}
          >
            <CardContent className="pt-4">
              <h3 className="font-display text-xl text-gold-300">{o.name}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-paper-300/80">{o.tagline}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button
        disabled={!picked || !name.trim()}
        onClick={() => picked && choose(name.trim(), gender, picked)}
        className="w-full"
      >
        定出身
      </Button>
    </div>
  );
}

export default OriginStep;
