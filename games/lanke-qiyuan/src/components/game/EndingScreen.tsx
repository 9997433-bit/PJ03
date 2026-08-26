'use client';

import { useState } from 'react';
import { Button, NodeRule } from '@/components/ui/primitives';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import type { EndingResult } from '@/engine/types';

const RANK_CLASS: Record<EndingResult['rank'], string> = {
  天: 'text-zhu-600 border-zhu-500',
  地: 'text-tai-500 border-tai-500',
  玄: 'text-yue-500 border-yue-500',
  黄: 'text-xia-700 border-xia-500',
};

export function EndingScreen({ ending, log }: { ending: EndingResult; log: readonly { id: number; text: string }[] }) {
  const abandon = useGameStore((s) => s.abandonSave);
  const exportSave = useGameStore((s) => s.exportSaveString);
  const [copied, setCopied] = useState(false);

  return (
    <div className="board-grid min-h-dvh overflow-y-auto px-4 py-12">
      <article className="mx-auto max-w-xl">
        <header className="text-center">
          <span
            className={cn(
              'seal inline-flex h-10 w-10 items-center justify-center border text-lg rounded-[2px]',
              RANK_CLASS[ending.rank],
            )}
          >
            {ending.rank}
          </span>
          <h1 className="mt-4 font-display text-4xl tracking-[0.2em] text-yan-900">{ending.title}</h1>
          <p className="mt-2 text-sm text-yan-500">{ending.closing}</p>
        </header>

        <NodeRule className="my-8" />

        <p className="text-[15px] leading-[2] text-yan-900 indent-8">{ending.epitaph}</p>

        <NodeRule className="my-8" />

        <section aria-label="生涯统计">
          <h2 className="mb-2 font-display text-sm tracking-[0.18em] text-zhu-600">一生所历</h2>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-yan-700 sm:grid-cols-2">
            {ending.summary.map((line) => (
              <li key={line} className="tabular-nums">{line}</li>
            ))}
          </ul>
        </section>

        <NodeRule className="my-8" />

        <div className="flex flex-wrap justify-center gap-2">
          <Button
            tone="zhu"
            onClick={() => {
              abandon();
              window.location.href = './';
            }}
          >
            再入一世
          </Button>
          <Button
            onClick={() => {
              const blob = exportSave();
              if (!blob) return;
              void navigator.clipboard?.writeText(blob).then(() => setCopied(true));
            }}
          >
            {copied ? '已抄录' : '抄录此谱'}
          </Button>
        </div>

        <details className="mt-10">
          <summary className="cursor-pointer text-xs text-yan-500">展开末段棋录</summary>
          <div className="mt-2 space-y-1 text-[12px] leading-relaxed text-yan-500">
            {log.slice(-40).map((e) => (
              <p key={e.id}>{e.text}</p>
            ))}
          </div>
        </details>
      </article>
    </div>
  );
}
