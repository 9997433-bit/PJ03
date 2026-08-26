/**
 * divination.ts — 推演命数 (deterministic look-ahead)
 *
 * The dice authority is serializable, which means the future is already on the
 * wheel: `peekDice` reads the values the PRNG is *about* to produce without
 * turning it. Divination is built on that, so a forecast and the turn it
 * describes physically cannot disagree.
 *
 * Three depths, three honesty levels:
 *   浅观 — probabilities only. No peek; costs almost nothing.
 *   深演 — reads the raw next D100 and tells you whether the 劫运判定 clears.
 *   窥天 — replays the entire next 劫运 phase on a throwaway copy of the state
 *          and reports, by name, the 劫 that is coming.
 *
 * Crucially the command itself burns **no** audited rolls. If it did, the act
 * of looking would move what you were looking at. The price is paid in 玄晶,
 * 法力 and 天机反噬 — a flat 劫运 surcharge for the impertinence.
 */

import { tierOf } from '@/data/calamities';
import { realmDef } from '@/data/realms';
import { breakthroughOdds } from './breakthrough';
import { calamityAccrual, calamityPhase, strikeThreshold } from './calamity';
import { BUCKET_BANDS, bucketForRoll, fortuneOffset } from './events';
import { derive } from './derived';
import { peekDice } from './rng';
import type {
  DivinationCost,
  DivinationDepth,
  Forecast,
  ForecastLine,
  GameState,
  LogEntry,
} from './types';
import { adjustCalamity, clamp, cloneState, entry, round1 } from './util';

export const DEPTH_LABELS: Record<DivinationDepth, string> = {
  shallow: '浅观',
  deep: '深演',
  heavenly: '窥天',
};

const BASE_COST: Record<DivinationDepth, DivinationCost> = {
  shallow: { stones: 60, calamity: 1, mana: 12, costsTurn: false },
  deep: { stones: 280, calamity: 3, mana: 34, costsTurn: false },
  heavenly: { stones: 950, calamity: 7, mana: 80, costsTurn: true },
};

export function divinationCost(state: GameState, depth: DivinationDepth): DivinationCost {
  const d = derive(state.character!);
  const base = BASE_COST[depth];
  return {
    stones: Math.max(0, Math.round(base.stones * (1 - d.divinationDiscount))),
    mana: Math.max(0, Math.round(base.mana * (1 - d.divinationDiscount * 0.5))),
    calamity: Math.max(0, base.calamity - d.backlashRelief),
    costsTurn: base.costsTurn,
  };
}

export function canDivine(state: GameState, depth: DivinationDepth): string | null {
  const c = state.character!;
  const cost = divinationCost(state, depth);
  if (c.spiritStones < cost.stones) return `玄晶不足(需 ${cost.stones})`;
  if (c.mana < cost.mana) return `法力不足(需 ${cost.mana})`;
  return null;
}

function bucketTable(): string {
  return BUCKET_BANDS.map((b) => `${b.bucket} ${b.min}–${b.max}`).join(' / ');
}

/** Build the forecast without touching the wheel. */
export function buildForecast(state: GameState, depth: DivinationDepth): Forecast {
  const c = state.character!;
  const lines: ForecastLine[] = [];
  const accrual = calamityAccrual(state);
  const projected = clamp(round1(c.calamity.value + accrual), 0, 100);
  const threshold = strikeThreshold(projected);

  lines.push({
    label: '劫运',
    chance: threshold,
    detail: `今为 ${round1(c.calamity.value)}〔${tierOf(c.calamity.value)}〕,明载自增 ${accrual} → ${projected}〔${tierOf(projected)}〕。落劫需 D100 ≤ ${threshold}。`,
    tone: threshold >= 30 ? 'bad' : threshold > 0 ? 'neutral' : 'good',
  });

  const bo = breakthroughOdds(state);
  lines.push({
    label: '破关',
    chance: bo.ready ? bo.chance : null,
    detail: bo.ready
      ? `${bo.targetRealm}:D100 ≤ ${bo.chance};成则劫运 +${bo.calamityOnEntry},败则折修为 ${Math.round(bo.failure.expLoss * 100)}%、死劫 ${bo.failure.deathChance}%。`
      : '此关未满,破无可破。',
    tone: bo.ready && bo.chance >= 55 ? 'good' : bo.ready ? 'bad' : 'neutral',
  });

  const offset = fortuneOffset(state);
  lines.push({
    label: '遭遇',
    chance: null,
    detail: `气运偏移 ${offset >= 0 ? '+' : ''}${offset};分桶 ${bucketTable()}。`,
    tone: offset >= 0 ? 'good' : 'bad',
  });

  if (depth === 'shallow') {
    return {
      turn: state.turn + 1,
      depth,
      lines,
      backlash: divinationCost(state, depth).calamity,
      summary: '浅观只见形势,不见数目。',
    };
  }

  // ---- 深演:read the raw wheel -------------------------------------------
  const peeks = peekDice(state.rngState, 'D100', 3);
  let cursor = 0;
  const jieRoll = threshold > 0 ? peeks[cursor++]! : null;
  const strikeComing = jieRoll !== null && jieRoll <= threshold;

  lines.push({
    label: '下一掷',
    chance: null,
    detail:
      jieRoll !== null
        ? `劫运判定将掷 ${jieRoll},需 ≤ ${threshold} → ${strikeComing ? '落劫' : '无事'}。`
        : `劫运未及判定之数,下一掷 ${peeks[0]} 将用于你所行之事。`,
    peek: String(jieRoll ?? peeks[0]),
    tone: strikeComing ? 'bad' : 'good',
  });

  if (!strikeComing) {
    const bucketRoll = peeks[cursor]!;
    lines.push({
      label: '若往探索',
      chance: null,
      detail: `定桶将掷 ${bucketRoll},偏移后 ${clamp(bucketRoll + offset, 1, 100)} → 〔${bucketForRoll(bucketRoll + offset)}〕。`,
      peek: String(bucketRoll),
      tone: 'neutral',
    });
  }

  if (depth === 'deep') {
    return {
      turn: state.turn + 1,
      depth,
      lines,
      backlash: divinationCost(state, depth).calamity,
      summary: strikeComing ? '深演所见:明载有劫。' : '深演所见:明载无劫。',
    };
  }

  // ---- 窥天:simulate the whole phase on a throwaway copy ------------------
  const probe = cloneState(state);
  const probeLogs = calamityPhase(probe);
  const struck = probeLogs.some((l) => l.speaker === '劫');
  lines.push({
    label: '窥天',
    chance: null,
    detail: struck
      ? probeLogs
          .filter((l) => l.speaker === '劫')
          .map((l) => l.text)
          .join(' ')
      : '明载天光平和,无劫可窥。',
    tone: struck ? 'bad' : 'good',
  });
  if (probe.phase === 'combat' && probe.combat) {
    lines.push({
      label: '劫相',
      chance: null,
      detail: `明载将有劫相拦路,须以斗法应之。`,
      tone: 'bad',
    });
  }

  const order = realmDef(c.realm.realm).order;
  lines.push({
    label: '寿数',
    chance: null,
    detail: `年 ${c.age} / 寿 ${c.lifespan}(${realmDef(c.realm.realm).name},第 ${order} 阶)。`,
    tone: c.lifespan - c.age < 20 ? 'bad' : 'neutral',
  });

  return {
    turn: state.turn + 1,
    depth,
    lines,
    backlash: divinationCost(state, depth).calamity,
    summary: struck ? '窥天所见:劫已具名。' : '窥天所见:明载无劫。',
  };
}

export function divine(state: GameState, depth: DivinationDepth): LogEntry[] {
  const c = state.character!;
  const blocked = canDivine(state, depth);
  if (blocked) return [entry(state.turn, '系统', blocked, 'danger')];

  const cost = divinationCost(state, depth);
  // The backlash is paid *before* the reading, so the numbers the player sees
  // already include the cost of having looked.
  c.spiritStones -= cost.stones;
  c.mana = clamp(c.mana - cost.mana, 0, c.maxMana);
  adjustCalamity(state, cost.calamity);
  const forecast = buildForecast(state, depth);
  state.stats.divinations += 1;
  c.flags.divinations = (Number(c.flags.divinations) || 0) + 1;
  state.forecast = forecast;

  const out: LogEntry[] = [
    entry(
      state.turn,
      '天机',
      `${DEPTH_LABELS[depth]}:耗玄晶 ${cost.stones}、法力 ${cost.mana};天机反噬,劫运 +${cost.calamity}。`,
      'calm',
    ),
  ];
  for (const line of forecast.lines) {
    out.push(entry(state.turn, '天机', `〔${line.label}〕${line.detail}`, 'calm'));
  }
  out.push(entry(state.turn, '天机', forecast.summary, 'calm'));
  return out;
}
