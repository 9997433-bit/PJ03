'use client';

import type { GameState } from '@/engine/types';
import { useGameStore } from '@/store/gameStore';

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  active: { text: '进行中', cls: 'text-jade-400 border-jade-600/50' },
  done: { text: '已成', cls: 'text-gold-300 border-gold-600/50' },
  failed: { text: '已败', cls: 'text-crimson-500 border-crimson-500/50' },
  locked: { text: '未启', cls: 'text-paper-500 border-ink-600' },
};

/** 任务 — main/side quests + NPC favor list (人脉). */
export function QuestView({ state }: { state: GameState }) {
  const execute = useGameStore((s) => s.execute);
  const visible = state.quests.filter((q) => q.status !== 'locked');
  const npcs = Object.values(state.npcs);

  return (
    <div className="flex flex-col gap-4 p-3 font-sans text-sm">
      <section>
        <p className="mb-2 text-[11px] tracking-[0.3em] text-paper-500">因果簿</p>
        {visible.length === 0 && <p className="font-serif text-xs text-paper-500">尚无未了之事。</p>}
        <div className="flex flex-col gap-2">
          {visible.map((q) => (
            <div key={q.id} className="border border-ink-600/70 bg-ink-800/40 p-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className={q.kind === 'main' ? 'text-gold-300' : 'text-paper-200'}>{q.title}</span>
                <span className={`shrink-0 border px-1.5 py-0.5 text-[10px] ${STATUS_LABEL[q.status]?.cls ?? 'text-paper-500 border-ink-600'}`}>
                  {STATUS_LABEL[q.status]?.text ?? q.status}
                </span>
              </div>
              <p className="mt-1 font-serif text-xs leading-5 text-paper-400">{q.narrative}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-[11px] tracking-[0.3em] text-paper-500">人脉</p>
        <div className="flex flex-col gap-1.5">
          {npcs.map((n) => {
            const ratio = Math.max(0, Math.min(1, (n.favor + 100) / 200));
            return (
              <div key={n.id} className="border border-ink-600/60 bg-ink-800/30 p-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-paper-200">{n.name}</span>
                  <span className={`text-xs tabular-nums ${n.favor >= 0 ? 'text-jade-400' : 'text-crimson-500'}`}>
                    {n.favor}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-paper-500">{n.identity}</p>
                <div className="bar-track mt-1.5 h-1 w-full">
                  <div className={n.favor >= 0 ? 'bar-fill-jade' : 'bar-fill-crimson'} style={{ width: `${ratio * 100}%` }} />
                </div>
                <button
                  onClick={() => execute(`赠礼 ${n.name}`)}
                  className="mt-1.5 border border-ink-600 px-2 py-0.5 text-[10px] text-paper-400 transition-colors hover:border-gold-600/50 hover:text-gold-300"
                  title="奉上灵石二十枚为礼"
                >
                  赠礼（20灵石）
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
