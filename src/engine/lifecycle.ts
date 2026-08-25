import type { GameState, Notice } from './types';
import { ENDINGS } from '@/data/endings';
import { getRealmDef, realmLabel } from '@/data/realmData';
import { log, LINES } from './narrative';

/** Terminate the run with an ending. */
export function finishGame(state: GameState, endingId: string): void {
  const def = ENDINGS[endingId] ?? ENDINGS.combat_death;
  const c = state.character;
  const summaryParts: string[] = [];
  if (c) {
    summaryParts.push(`享年${c.age}岁`);
    summaryParts.push(`止步于${realmLabel(c.realm)}`);
    summaryParts.push(`历${state.turn}转`);
    summaryParts.push(`掷骰${state.rolls.length >= 500 ? '五百余' : state.rollSeq}次`);
    summaryParts.push(`身余灵石${c.spiritStones}枚`);
  }
  state.ending = { id: def.id, title: def.title, summary: summaryParts.join('，') + '。' };
  state.phase = 'ended';
  state.combat = null;
  state.pendingChoice = null;
  log(state, '天道', def.line, endingId === 'ascension' ? 'gold' : 'danger');
}

/** 1 turn = 3 months. Ages, warns near death, ends the run at the limit. */
export function advanceAge(state: GameState): Notice[] {
  const c = state.character!;
  const notices: Notice[] = [];
  if (state.turn % 4 === 0) {
    c.age += 1;
    const left = c.lifespan - c.age;
    if (left <= 0) {
      finishGame(state, 'lifespan_end');
      return [{ kind: 'danger', title: '寿元耗尽', desc: '灯枯油尽，坐化于蒲团之上。' }];
    }
    for (const threshold of [30, 10, 5]) {
      const flagKey = `ageWarn${threshold}`;
      if (left <= threshold && !c.flags[flagKey]) {
        c.flags[flagKey] = true;
        log(state, '天道', LINES.ageWarning(left), 'danger');
        notices.push({ kind: 'warning', title: '寿元将尽', desc: `仅余${left}载。突破境界可延寿元。` });
        break;
      }
    }
  }
  return notices;
}

/** Victory check: 化神大圆满 with full exp ⇒ 飞升. */
export function checkAscension(state: GameState): boolean {
  const c = state.character!;
  if (c.realm.realm === 'deity' && c.realm.stage === '大圆满' && c.realm.exp >= c.realm.expNeeded) {
    finishGame(state, 'ascension');
    return true;
  }
  return false;
}

/** HP floor check outside combat. */
export function checkDeath(state: GameState): boolean {
  const c = state.character!;
  if (c.hp <= 0 && state.phase !== 'ended') {
    finishGame(state, 'qi_deviation_death');
    return true;
  }
  return false;
}

export function lifespanFor(state: GameState): number {
  return getRealmDef(state.character!.realm.realm).lifespan;
}
