'use client';

import { useGameStore } from '@/store/gameStore';
import { Button } from './primitives';

export function TitleScreen() {
  const begin = useGameStore((s) => s.begin);
  const loadSave = useGameStore((s) => s.loadSave);
  const newGame = useGameStore((s) => s.newGame);
  const hasSave = useGameStore((s) => s.hasSave);
  const seed = useGameStore((s) => s.state.seed);

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-6 py-16">
      <div className="anim-drift text-center">
        <p className="mb-6 text-xs tracking-[0.6em] text-star-faint">大 乾 · 钦 天 监 秘 档</p>
        <h1 className="font-cjk-serif text-5xl tracking-[0.35em] text-star sm:text-6xl">灭运图录</h1>
        <div className="startrack my-6 w-full" />
        <p className="font-cjk-serif text-sm tracking-[0.3em] text-amethyst">人 生 模 拟 器</p>
      </div>

      <div className="panel mt-12 w-full max-w-xl p-6">
        <p className="font-cjk-serif text-[15px] leading-8 text-star-dim">
          天地间每个人身后都立着一根柱子,凡人看不见,修士看得见,而图录能在上面落笔。
          柱子越亮,走得越远;越亮,天看你也看得越清楚。
        </p>
        <p className="mt-4 font-cjk-serif text-[15px] leading-8 text-star-dim">
          这一局里没有隐藏的骰子:每一次判定的目标数、每一条抉择的胜算、每一笔劫运的来路,
          都会在你落子之前摆在桌上。你仍然会输——但你会明白自己输在哪一格。
        </p>
        <div className="startrack my-5" />
        <ul className="space-y-1.5 text-xs text-star-faint">
          <li>· 气运与劫运同源:一切让你变强的,都在给天记账。</li>
          <li>· 推演命数可以真的看见下一掷,代价是天机反噬。</li>
          <li>· 十四种结局,条条都由你自己的账本决定。</li>
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button tone="primary" onClick={begin} hotkey="1">
          开卷立命
        </Button>
        {hasSave ? (
          <Button onClick={loadSave} hotkey="2">
            续读前卷
          </Button>
        ) : null}
        <Button tone="ghost" onClick={() => newGame()} ariaLabel="另换一个种子">
          换一副星轨
        </Button>
      </div>

      <p className="mt-8 text-[11px] tracking-widest text-star-faint">星轨种子 {seed}</p>
    </main>
  );
}
