'use client';

import { enemyById } from '@/data/enemies';
import { ACTION_HINTS, COMBAT_ACTIONS, fleeChance, manaCostOf, spoilsOptions } from '@/engine/combat';
import type { GameState } from '@/engine/types';
import type { Command } from '@/engine/turn';
import { Bar, Button, SectionTitle } from './primitives';
import { countItem } from '@/engine/util';

export function CombatPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: (c: Command) => void;
}) {
  const combat = state.combat;
  const c = state.character;
  if (!combat || !c) return null;
  const enemy = enemyById(combat.enemyId);
  if (!enemy) return null;

  const spoils = combat.awaitingSpoils ? spoilsOptions(state) : [];
  const manaCost = manaCostOf(state);
  const talismans = countItem(c.inventory, 'wuleifu');

  return (
    <section
      className="panel border-jie-dim/60 p-4"
      aria-label="斗法"
      role="region"
    >
      <SectionTitle note={`第 ${combat.round} 合`}>
        斗法 · {enemy.name}
      </SectionTitle>
      <p className="mb-3 text-xs leading-6 text-star-dim">
        {enemy.identity} · 威能 {enemy.power} · 护体 {enemy.defense}
        {enemy.isCalamity ? ' · 劫数所化,不可遁、不可议' : ''}
      </p>
      <div className="mb-1 flex items-baseline justify-between text-[11px] text-star-faint">
        <span>{enemy.name}</span>
        <span className="tabular-nums">
          {combat.enemyHp}/{combat.enemyMaxHp}
        </span>
      </div>
      <Bar
        value={combat.enemyHp}
        max={combat.enemyMaxHp}
        color="linear-gradient(90deg,#5a1230,#ff6180)"
        label={`${enemy.name}气血`}
      />

      {combat.awaitingSpoils ? (
        <div className="mt-4">
          <p className="mb-2 font-cjk-serif text-sm text-track">
            他倒下了,身后那根柱子还立着。你要如何处置?
          </p>
          <div className="space-y-2">
            {spoils.map((s, i) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3">
                <Button
                  tone={s.id === '灭运' ? 'danger' : s.id === '饶恕' ? 'gold' : 'default'}
                  hotkey={String(i + 1)}
                  onClick={() => dispatch({ kind: '战利', choice: s.id })}
                >
                  {s.label}
                </Button>
                <span className="text-xs text-star-dim">{s.detail}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {COMBAT_ACTIONS.map((action, i) => {
            const disabled =
              (action === '术法' && c.mana < manaCost) ||
              (action === '用符' && talismans < 1) ||
              (action === '遁走' && !enemy.fleeable);
            const extra =
              action === '术法'
                ? `法力 ${manaCost}`
                : action === '用符'
                  ? `五雷符 ${talismans}`
                  : action === '遁走'
                    ? enemy.fleeable
                      ? `成算 ${fleeChance(state, enemy)}%`
                      : '不可遁'
                    : '';
            return (
              <div key={action} className="rounded border border-rim-soft/60 p-2">
                <Button
                  full
                  hotkey={String(i + 1)}
                  disabled={disabled}
                  tone={action === '遁走' ? 'ghost' : 'default'}
                  onClick={() => dispatch({ kind: '战斗', action })}
                >
                  {action}
                  {extra ? <span className="ml-1 text-[11px] text-star-faint">{extra}</span> : null}
                </Button>
                <p className="mt-1 text-[11px] leading-5 text-star-faint">{ACTION_HINTS[action]}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
