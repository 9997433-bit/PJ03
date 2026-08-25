// ============================================================================
// lifecycle.ts — age / 寿元 / death / ending triggers
//
// 1 turn = 3 in-world months; age rises 1 per 4 turns. Endings:
//   oldAge 寿元耗尽·坐化 · combatDeath 身死道消 (hp ≤ 0) ·
//   breakthroughDeath 破关陨落 (raised by breakthrough.ts) ·
//   qiDeviation 走火入魔 (events) · ascension 飞升之门 (化神大圆满圆满, victory)
//
// PURE TypeScript. Two API layers:
//   - pure helpers (ageAtTurn, advanceLifecycle, checkEnding, makeEnding);
//   - GameState wrappers used by turn.ts (advanceAge, checkAscension,
//     checkDeath, finishGame) — these mutate the turn-local cloned state.
// ============================================================================

import type { Character, EndingResult, GameState, LogEntry } from './types';
import { LOG_CAP, STARTING_AGE, TURNS_PER_YEAR } from './types';
import { isAtMajorGate, realmLabelOf } from './realms';
import type { Notice } from './attributes';

export { TURNS_PER_YEAR };
export const START_AGE = STARTING_AGE;
/** When remaining 寿元 drops to this many years, 天道 starts warning. */
export const LIFESPAN_WARNING_YEARS = 3;

export type EndingId = 'oldAge' | 'combatDeath' | 'breakthroughDeath' | 'qiDeviation' | 'ascension';

interface EndingText {
  title: string;
  closing: string;
}

export const ENDING_DEFS: Record<EndingId, EndingText> = {
  oldAge: {
    title: '寿元耗尽·坐化',
    closing: '灯枯油尽，形神俱寂。天地不悲，亦不喜。',
  },
  combatDeath: {
    title: '身死道消',
    closing: '肉身既灭，魂魄无依。仙路断绝于此。',
  },
  breakthroughDeath: {
    title: '破关陨落',
    closing: '强求天机，气逆焚身。此关，汝未能渡。',
  },
  qiDeviation: {
    title: '走火入魔',
    closing: '心魔噬主，真元乱走。修行一途，败于己者最多。',
  },
  ascension: {
    title: '飞升之门',
    closing: '五百年一开之门，今为汝而启。去罢——上界无凡人。',
  },
};

// ============================================================================
// Pure helpers
// ============================================================================

/** Character age implied by the turn counter (age never goes backwards). */
export function ageAtTurn(turn: number): number {
  return START_AGE + Math.floor(Math.max(0, turn) / TURNS_PER_YEAR);
}

/** Compose the full ending record shown on the ending screen. */
export function makeEnding(id: EndingId, ch: Pick<Character, 'age' | 'realm' | 'name'>): EndingResult {
  const def = ENDING_DEFS[id];
  const where = realmLabelOf(ch.realm);
  const summary =
    id === 'ascension'
      ? `${ch.name}，${ch.age}岁，修至${where}，肉身破碎虚空，得窥仙界。`
      : `${ch.name}，享年${ch.age}岁，止步于${where}。`;
  return { id, title: def.title, summary, closing: def.closing };
}

export interface LifecycleTick {
  character: Character;
  agedUp: boolean;
  /** names of injuries that fully healed this turn */
  healed: string[];
  /** 天道 warnings (near-death 寿元 etc.) */
  warnings: string[];
}

/**
 * Pure single-turn tick: injuries count down and expire (permanent injuries
 * have turnsLeft −1 and never expire), age follows the turn counter, and
 * 天道 warns when 寿元 nears its end. Never mutates its input.
 */
export function advanceLifecycle(character: Character, turn: number): LifecycleTick {
  const healed: string[] = [];
  const injuries = character.injuries
    .map((inj) => (inj.turnsLeft < 0 ? inj : { ...inj, turnsLeft: inj.turnsLeft - 1 }))
    .filter((inj) => {
      if (inj.turnsLeft === 0) {
        healed.push(inj.name);
        return false;
      }
      return true;
    });

  const newAge = Math.max(character.age, ageAtTurn(turn));
  const agedUp = newAge > character.age;

  const warnings: string[] = [];
  for (const name of healed) warnings.push(`旧伤渐愈：${name}已无碍。`);
  const remaining = character.lifespan - newAge;
  if (remaining > 0 && remaining <= LIFESPAN_WARNING_YEARS) {
    warnings.push('寿元将尽，灯枯之相已现。问道之心，可还未死？');
  }

  return { character: { ...character, injuries, age: newAge }, agedUp, healed, warnings };
}

/**
 * Pure ending detection, in priority order:
 *   hp ≤ 0 → 身死道消; age ≥ 寿元 → 坐化; 化神大圆满圆满 → 飞升 (victory).
 * Returns null while the run continues.
 */
export function checkEnding(character: Character): EndingResult | null {
  if (character.hp <= 0) return makeEnding('combatDeath', character);
  if (character.age >= character.lifespan) return makeEnding('oldAge', character);
  if (character.realm.realm === 'deity' && character.realm.stage === '大圆满' && isAtMajorGate(character.realm)) {
    return makeEnding('ascension', character);
  }
  return null;
}

// ============================================================================
// GameState wrappers (mutate the turn-local clone; single writer is turn.ts)
// ============================================================================

function log(state: GameState, speaker: LogEntry['speaker'], text: string, tone?: LogEntry['tone']): void {
  const id = state.nextLogId ?? (state.narrativeLog[state.narrativeLog.length - 1]?.id ?? 0) + 1;
  state.nextLogId = id + 1;
  state.narrativeLog.push({ id, turn: state.turn, speaker, text, tone });
  if (state.narrativeLog.length > LOG_CAP) state.narrativeLog.splice(0, state.narrativeLog.length - LOG_CAP);
}

/** Seal the run with an ending: sets state.ending, phase 'ended', closing log. */
export function finishGame(state: GameState, ending: EndingId | EndingResult): void {
  const c = state.character;
  const result: EndingResult =
    typeof ending === 'string'
      ? c
        ? makeEnding(ending, c)
        : { id: ending, ...ENDING_DEFS[ending], summary: '' }
      : ending;
  state.ending = result;
  state.phase = 'ended';
  log(state, '天道', result.summary, result.id === 'ascension' ? 'gold' : 'danger');
  if (result.closing) log(state, '天道', result.closing, result.id === 'ascension' ? 'gold' : 'muted');
}
/** legacy alias */
export const endGame = finishGame;

/**
 * Advance age with the turn counter, warn near the end of 寿元, and trigger
 * the 坐化 ending when 寿元 runs out. Called once per time-consuming turn.
 */
export function advanceAge(state: GameState): Notice[] {
  const c = state.character;
  if (!c || state.phase === 'ended') return [];
  const notices: Notice[] = [];

  const newAge = Math.max(c.age, ageAtTurn(state.turn));
  if (newAge > c.age) {
    c.age = newAge;
    const remaining = c.lifespan - c.age;
    if (remaining > 0 && remaining <= LIFESPAN_WARNING_YEARS) {
      log(state, '天道', '寿元将尽，灯枯之相已现。问道之心，可还未死？', 'danger');
      notices.push({ kind: 'warning', title: '寿元将尽', desc: `余寿不过${remaining}载。` });
    }
  }

  if (c.age >= c.lifespan) {
    finishGame(state, 'oldAge');
    notices.push({ kind: 'danger', title: '寿元耗尽', desc: '坐化于蒲团之上。' });
  }
  return notices;
}

/**
 * One tick of world time, called by turn.ts after every time-consuming
 * command: turn +1, injuries count down (and heal), status effects tick
 * (with per-turn hp drains/regens), age follows the calendar, and the
 * 坐化 / 身死道消 endings fire when their conditions are met.
 */
export function advanceTime(state: GameState): Notice[] {
  const c = state.character;
  if (!c || state.phase === 'ended') return [];
  const notices: Notice[] = [];

  state.turn += 1;

  // injuries tick + age via the pure helper
  const tick = advanceLifecycle(c, state.turn);
  state.character = tick.character;
  const ch = state.character;
  for (const w of tick.warnings) {
    log(state, '天道', w, w.includes('寿元') ? 'danger' : 'jade');
  }
  if (tick.healed.length > 0) {
    notices.push({ kind: 'success', title: '伤势痊愈', desc: tick.healed.join('、') });
  }

  // status effects (丹药增益/心魔滋扰等) tick down
  if (ch.statusEffects && ch.statusEffects.length > 0) {
    const expired: string[] = [];
    ch.statusEffects = ch.statusEffects
      .map((s) => (s.turnsLeft < 0 ? s : { ...s, turnsLeft: s.turnsLeft - 1 }))
      .filter((s) => {
        if (s.turnsLeft === 0) {
          expired.push(s.name);
          return false;
        }
        return true;
      });
    for (const s of ch.statusEffects) {
      if (s.hpPerTurn) ch.hp = Math.max(0, Math.min(ch.maxHp, ch.hp + s.hpPerTurn));
    }
    for (const name of expired) log(state, '系统', `【${name}】之效已尽。`, 'muted');
  }

  // mortality checks
  if (checkDeath(state)) {
    notices.push({ kind: 'danger', title: '身死道消', desc: '气血耗尽。' });
    return notices;
  }
  if (ch.age >= ch.lifespan) {
    finishGame(state, 'oldAge');
    notices.push({ kind: 'danger', title: '寿元耗尽', desc: '坐化于蒲团之上。' });
  }
  return notices;
}

/**
 * 静养 — spend a season nursing body and breath: restores hp and grants
 * injuries one extra season of healing. Time itself passes via advanceTime.
 */
export function rest(state: GameState): Notice[] {
  const c = state.character;
  if (!c || state.phase !== 'playing') return [];
  const notices: Notice[] = [];

  const heal = Math.max(10, Math.round(c.maxHp * 0.3));
  const before = c.hp;
  c.hp = Math.min(c.maxHp, c.hp + heal);

  // 调息疗伤:伤势额外痊愈一季
  const healed: string[] = [];
  c.injuries = c.injuries
    .map((inj) => (inj.turnsLeft < 0 ? inj : { ...inj, turnsLeft: inj.turnsLeft - 1 }))
    .filter((inj) => {
      if (inj.turnsLeft === 0) {
        healed.push(inj.name);
        return false;
      }
      return true;
    });

  const gained = c.hp - before;
  log(
    state,
    '天道',
    gained > 0
      ? `汝闭门谢客,调息静养。气血渐复,得${gained}点。`
      : '汝闭门静坐一季。气血本无损,聊算偷闲。',
    'jade'
  );
  for (const name of healed) {
    log(state, '天道', `旧伤渐愈:${name}已无碍。`, 'jade');
    notices.push({ kind: 'success', title: '伤势痊愈', desc: name });
  }
  return notices;
}

/** hp ≤ 0 → 身死道消. Returns true when the run just ended. */
export function checkDeath(state: GameState): boolean {
  const c = state.character;
  if (!c || state.phase === 'ended') return false;
  if (c.hp > 0) return false;
  c.hp = 0;
  finishGame(state, 'combatDeath');
  return true;
}

/** 化神大圆满 with a full exp wall → the MVP victory ending. */
export function checkAscension(state: GameState): boolean {
  const c = state.character;
  if (!c || state.phase === 'ended') return false;
  if (c.realm.realm !== 'deity' || c.realm.stage !== '大圆满' || !isAtMajorGate(c.realm)) return false;
  log(state, '天道', '天穹裂开一线金隙，仙音隐隐。此界再无可留汝之物。', 'gold');
  finishGame(state, 'ascension');
  return true;
}
