/**
 * helpers.ts — shared test fixtures
 *
 * `newRun` drives a character through the real four-step gate rather than
 * hand-constructing a `Character`, so every test starts from a state the
 * engine itself produced. Tests that need an unusual situation reach for
 * `forceRealm` / `give` afterwards instead of bypassing creation.
 */

import { expNeededFor } from '@/engine/cultivation';
import {
  beginCreation,
  drawDestiny,
  finishCreation,
  initialState,
  submitAllocation,
  submitName,
  submitOrigin,
} from '@/engine/creation';
import { derive } from '@/engine/derived';
import type { Attributes, GameState, RealmId } from '@/engine/types';
import { addItem } from '@/engine/util';

export const EVEN_ALLOCATION: Attributes = {
  shenHun: 3,
  tiPo: 3,
  wuXing: 3,
  dingLi: 3,
  jiBian: 0,
};

export interface RunOptions {
  originId?: string;
  allocation?: Attributes;
  name?: string;
  gender?: '男' | '女';
}

export function newRun(seed = 'test-seed', options: RunOptions = {}): GameState {
  let s = initialState(seed);
  s = beginCreation(s).state;
  s = submitName(s, options.name ?? '沈无咎', options.gender ?? '男').state;
  s = submitOrigin(s, options.originId ?? 'shusheng').state;
  s = submitAllocation(s, options.allocation ?? EVEN_ALLOCATION).state;
  s = drawDestiny(s).state;
  s = finishCreation(s).state;
  return s;
}

/** Drop the character into a realm without playing the intervening decades. */
export function forceRealm(state: GameState, realm: RealmId, full = false): GameState {
  const c = state.character!;
  c.realm.realm = realm;
  c.realm.layer = realm === 'yinqi' ? 1 : 0;
  c.realm.stage = '初期';
  c.realm.exp = 0;
  c.realm.expNeeded = expNeededFor(c.realm);
  if (full) {
    if (realm === 'yinqi') c.realm.layer = 9;
    else c.realm.stage = '圆满';
    c.realm.expNeeded = expNeededFor(c.realm);
    c.realm.exp = c.realm.expNeeded;
  }
  const d = derive(c);
  c.maxHp = d.maxHp;
  c.hp = d.maxHp;
  c.maxMana = d.maxMana;
  c.mana = d.maxMana;
  return state;
}

export function give(state: GameState, itemId: string, count = 1): GameState {
  addItem(state.character!.inventory, itemId, count);
  return state;
}

export function setCalamity(state: GameState, value: number): GameState {
  const c = state.character!;
  c.calamity.value = value;
  c.calamity.peak = Math.max(c.calamity.peak, value);
  return state;
}
