'use client';

import type { GameState } from '@/engine/types';

/**
 * 审计 — the full roll table so the player can verify fairness (layer 9).
 * The hidden 机缘 mapping is never revealed: the roll shows it happened,
 * not what it means.
 */
export function AuditView({ state }: { state: GameState }) {
  const rolls = [...state.rolls].reverse();

  return (
    <div className="flex flex-col p-3 font-sans text-xs">
      <div className="mb-2 border border-ink-600/70 bg-ink-800/40 p-2.5 leading-5 text-paper-400">
        <p>天道掷骰凡 <span className="text-gold-300 tabular-nums">{(state.rollSeq ?? 1) - 1}</span> 次，皆有籍可查。</p>
        <p className="mt-1 break-all text-[10px] text-paper-500">
          种子 {state.seed} · 链印 {state.auditHash}
        </p>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-ink-600 text-left text-[10px] tracking-widest text-paper-500">
            <th className="py-1.5 pr-2 font-normal">#</th>
            <th className="py-1.5 pr-2 font-normal">转</th>
            <th className="py-1.5 pr-2 font-normal">骰</th>
            <th className="py-1.5 pr-2 font-normal">值</th>
            <th className="py-1.5 font-normal">事由</th>
          </tr>
        </thead>
        <tbody>
          {rolls.map((r) => (
            <tr key={r.id} className="border-b border-ink-600/40 text-paper-400">
              <td className="py-1 pr-2 text-paper-500 tabular-nums">{r.id}</td>
              <td className="py-1 pr-2 tabular-nums">{r.turn}</td>
              <td className="py-1 pr-2 text-paper-500">{r.die}</td>
              <td className={`py-1 pr-2 tabular-nums ${r.die === 'D100' && r.value >= 91 ? 'text-gold-300' : r.die === 'D100' && r.value <= 10 ? 'text-crimson-500' : 'text-paper-200'}`}>
                {r.value}
              </td>
              <td className="py-1">{r.reason}</td>
            </tr>
          ))}
          {rolls.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center font-serif text-paper-500">
                天道未掷一骰。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
