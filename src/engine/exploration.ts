/**
 * exploration.ts — 探索: locations with D100 discovery tables,
 * loot quality nudged by 气运.
 */

import type { GameState, LocationDef } from './types';
import { REALM_ORDER, recordRoll } from './audit';
import { gainExp } from './cultivation';
import { addItem } from './inventory';
import { startCombat } from './combat';
import { checkHpDeath } from './lifecycle';
import { EXPLORE_INTRO_LINES, pick, say, sys } from './narrative';
import { LOCATIONS, getLocation, makeInjury, getOrigin } from '@/data';

/** locations the character may currently enter */
export function unlockedLocations(state: GameState): LocationDef[] {
  const c = state.character;
  if (!c) return [];
  const order = REALM_ORDER[c.realm.realm] ?? 0;
  return LOCATIONS.filter((l) => (REALM_ORDER[l.minRealm] ?? 99) <= order);
}

/** the 探索 command */
export function explore(state: GameState, locationId?: string): void {
  const c = state.character;
  if (!c) return;

  const unlocked = unlockedLocations(state);
  if (unlocked.length === 0) {
    sys(state, '此身羸弱,无处可去。');
    return;
  }

  let loc: LocationDef | undefined;
  if (locationId) {
    loc = getLocation(locationId);
    if (!loc || !unlocked.some((l) => l.id === loc!.id)) {
      sys(state, `以汝之修为,尚不可涉足彼处。可去:${unlocked.map((l) => l.name).join('、')}。`);
      return;
    }
  } else {
    loc = unlocked[unlocked.length - 1]!; // deepest ground you can walk
  }

  say(state, pick(state, EXPLORE_INTRO_LINES).replace('{place}', loc.name));

  const roll = recordRoll(state, 'D100', `探索·${loc.name}`);
  const effective = Math.max(1, Math.min(100, roll + (c.attributes.qiYun - 5)));
  const entry = loc.discoveries.find((d) => effective >= d.min && effective <= d.max);
  if (!entry) {
    say(state, '此行无话。');
    return;
  }

  say(state, entry.narrative, entry.kind === 'combat' || entry.kind === 'injury' ? 'danger' : 'normal');

  switch (entry.kind) {
    case 'item':
      if (entry.itemId) addItem(state, entry.itemId, entry.count ?? 1);
      break;
    case 'stones': {
      const [lo, hi] = entry.stones ?? [0, 0];
      if (hi > 0) {
        const r2 = recordRoll(state, 'D100', '探索·所获');
        const stones = Math.round(lo + ((hi - lo) * (r2 - 1)) / 99);
        c.spiritStones += stones;
        state.stats.stonesEarned += stones;
        sys(state, `灵石 +${stones}(现有${c.spiritStones})。`, 'jade');
      }
      break;
    }
    case 'exp':
    case 'insight':
      if (entry.exp) {
        gainExp(state, entry.exp);
        sys(state, `修为 +${entry.exp}。`, 'jade');
      }
      break;
    case 'combat':
      if (entry.enemyId) startCombat(state, entry.enemyId);
      break;
    case 'injury': {
      if (entry.injuryId) {
        const origin = getOrigin(c.originId);
        const injury = makeInjury(entry.injuryId, origin?.perk === 'injuryRecovery' ? 1 : 0);
        if (injury) {
          c.injuries.push(injury);
          c.hp = Math.max(1, c.hp - Math.round(c.maxHp * 0.15));
          sys(state, `汝身负【${injury.name}】,${injury.turnsLeft}季方愈。`, 'danger');
        }
      }
      break;
    }
    case 'nothing':
      break;
  }
  checkHpDeath(state);
}
