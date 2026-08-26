'use client';

import { useEffect, useState } from 'react';
import { Button, NodeRule, Stone } from '@/components/ui/primitives';
import { useGameStore } from '@/store/gameStore';
import { useRouter } from 'next/navigation';
import { formatRealm } from '@/engine/prose';
import { cn } from '@/lib/utils';

/**
 * 标题页. Three doors: continue, start over, or paste a copied save.
 * A corrupt blob closes the first door and says so plainly.
 */
export default function TitlePage() {
  const { state, hydrated, corruptSave, hydrate, startNewLife, abandonSave, importSaveString } =
    useGameStore();
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [blob, setBlob] = useState('');
  const [seed, setSeed] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const hasSave = state !== null;
  const go = () => router.push('/game');

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="bamboo-field" aria-hidden="true" />
      <div className="board-grid absolute inset-0 opacity-40" aria-hidden="true" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="mb-8 flex items-end gap-3" aria-hidden="true">
          <Stone color="black" size={13} />
          <Stone color="white" size={13} />
          <Stone color="black" size={13} />
        </div>

        <h1 className="font-display text-5xl tracking-[0.28em] text-yan-900 sm:text-6xl">烂柯棋缘</h1>
        <p className="mt-3 text-sm tracking-[0.35em] text-zhu-600">人 生 模 拟 器</p>

        <NodeRule className="my-8 w-full" />

        <p className="max-w-sm text-center text-sm leading-[2] text-yan-700">
          王质入山采樵,见二童子对弈。一局未终,斧柯已烂。
          <br />
          <span className="text-yan-500">
            这里没有仗可打。汝只是走路、看棋、与山精鬼怪对坐,
            <br />
            在七境之上,把一局下完。
          </span>
        </p>

        <div className="mt-10 flex w-full flex-col gap-2">
          {corruptSave ? (
            <div className="border border-xia-500 bg-xia-500/8 px-3 py-2.5 text-center text-sm text-xia-700 rounded-sm">
              {corruptSave}
              <br />
              <span className="text-[11px] text-yan-500">校验和不合。此谱只能弃了重开。</span>
            </div>
          ) : hasSave && state ? (
            <>
              <Button tone="zhu" onClick={go} className="w-full py-2.5">
                续弈
                <span className="ml-2 text-xs opacity-80">
                  {state.character
                    ? `${state.character.name} · ${formatRealm(state.character.realm)}`
                    : '命格未定'}
                </span>
              </Button>
              {!confirmReset ? (
                <Button tone="quiet" onClick={() => setConfirmReset(true)} className="w-full">
                  另开一局
                </Button>
              ) : (
                <div className="border border-xia-500/60 bg-xia-500/6 p-3 text-center rounded-sm">
                  <p className="text-sm text-xia-700">另开一局,此谱即弃。收子无悔。</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      tone="xia"
                      className="flex-1"
                      onClick={() => {
                        startNewLife(seed);
                        go();
                      }}
                    >
                      收子
                    </Button>
                    <Button className="flex-1" onClick={() => setConfirmReset(false)}>
                      再想想
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Button
              tone="zhu"
              className="w-full py-2.5"
              onClick={() => {
                startNewLife(seed);
                go();
              }}
            >
              入局
            </Button>
          )}

          {!hydrated && <p className="text-center text-xs text-yan-500">正在翻找旧谱……</p>}

          <details className="mt-2">
            <summary className="cursor-pointer text-center text-xs text-yan-500">
              指定种子 / 续他人之谱
            </summary>
            <div className="mt-2 space-y-2">
              <input
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="种子（留白则由弈者随取）"
                aria-label="种子"
                className="w-full border border-xuan-400 bg-xuan-50 px-3 py-1.5 text-sm rounded-sm focus:border-zhu-500 focus:outline-none"
              />
              <p className="text-[11px] leading-relaxed text-yan-500">
                同一种子 + 同一串指令 ⇒ 同一世人生,逐字节一致。
              </p>
              {!showImport ? (
                <Button className="w-full" onClick={() => setShowImport(true)}>
                  粘贴棋谱
                </Button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={blob}
                    onChange={(e) => setBlob(e.target.value)}
                    rows={3}
                    placeholder="抄录所得的一长串字符"
                    aria-label="棋谱字符串"
                    className="w-full border border-xuan-400 bg-xuan-50 px-2 py-1.5 text-[11px] rounded-sm focus:border-zhu-500 focus:outline-none"
                  />
                  <Button
                    tone="zhu"
                    className="w-full"
                    onClick={() => {
                      if (importSaveString(blob)) go();
                    }}
                  >
                    续此谱
                  </Button>
                </div>
              )}
              {(hasSave || corruptSave) && (
                <Button
                  tone="xia"
                  className="w-full"
                  onClick={() => {
                    abandonSave();
                    setConfirmReset(false);
                  }}
                >
                  抹去本机存档
                </Button>
              )}
            </div>
          </details>
        </div>

        <p className={cn('mt-10 text-center text-[11px] leading-relaxed text-yan-300')}>
          全程离线 · 种子化骰子 · 每一掷皆入棋录可复核
        </p>
      </div>
    </main>
  );
}
