'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Btn, Panel, Rule, Stone } from './ui';

export function TitleScreen() {
  const { startNew, continueSaved, hasSave, loadError } = useGameStore();
  const [seed, setSeed] = useState('');
  const [showSeed, setShowSeed] = useState(false);

  return (
    <main className="goban-field relative flex min-h-screen items-center justify-center px-5 py-16">
      <div className="goban-stars" />
      <div className="animate-fade-rise w-full max-w-2xl">
        <div className="mb-10 text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <Stone />
            <Stone white />
            <Stone />
          </div>
          <h1 className="text-bamboo-gradient glow-bamboo text-5xl leading-tight font-normal tracking-[0.3em] sm:text-6xl">
            烂柯棋缘
          </h1>
          <p className="text-paper-400 mt-5 text-sm tracking-[0.42em]">人 生 模 拟 器</p>
        </div>

        <Panel className="px-7 py-8 sm:px-10" corners>
          <p className="text-paper-200 text-[15px] leading-[2]">
            晋人王质入山伐木,见二童子对弈。局终,童子问:「汝斧柯烂矣,何不去?」
          </p>
          <p className="text-paper-400 mt-3 text-[13px] leading-[2]">
            王质下山,同辈已尽为尘土。世人自此记住了那柄朽斧,却无人问过——那一局,究竟下的是什么。
          </p>

          <Rule />

          <p className="text-paper-400 text-[13px] leading-[2]">
            此间没有刀兵,没有仇雠,没有非赢不可的一战。汝会走很多路,看很多局别人的棋,与山精鬼怪坐下手谈,
            在无人处坐忘一整个下午。修为长得很慢,可日子是自己的。
          </p>
          <p className="text-paper-500 mt-3 text-[12px] leading-[2]">
            所有随机皆出自种子化骰子,逐掷入册,随时可查。缘法暗掷一次,终生不示。
          </p>

          <div className="mt-9 flex flex-col gap-3">
            <Btn primary className="py-3 text-base tracking-[0.3em]" onClick={() => startNew(seed)}>
              入 局
            </Btn>
            {hasSave && (
              <Btn className="py-2.5 tracking-[0.3em]" onClick={continueSaved}>
                续 弈
              </Btn>
            )}
            <button
              type="button"
              onClick={() => setShowSeed((v) => !v)}
              className="text-paper-500 hover:text-bamboo-300 mt-1 text-[11px] tracking-[0.24em] transition-colors"
            >
              {showSeed ? '收起棋子记号' : '指定棋子记号(种子)'}
            </button>
            {showSeed && (
              <input
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="留空则由天道自取"
                className="border-ink-600 bg-ink-900 text-paper-200 placeholder:text-paper-500 focus:border-bamboo-600 w-full border px-3 py-2 text-center text-[13px] tracking-widest outline-none"
              />
            )}
          </div>

          {loadError && (
            <p className="text-dusk-400 mt-5 text-center text-[12px] tracking-wider">{loadError}</p>
          )}
        </Panel>

        <p className="text-paper-500 mt-8 text-center text-[11px] tracking-[0.24em]">
          纯前端 · 无后端 · 存档在浏览器本地
        </p>
      </div>
    </main>
  );
}
