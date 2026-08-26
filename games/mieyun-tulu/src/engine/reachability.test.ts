/**
 * reachability.test.ts — 结局可达性
 *
 * `endings.test.ts` proves each ending is *awardable*: hand a `checkEndings` the
 * right state and the right id comes back. That is a weaker claim than it looks.
 * It passes just as happily for an ending whose conditions no sequence of legal
 * commands can ever produce — a room with a door and no corridor.
 *
 * This file supplies the corridor. Each policy below is a plausible way to play
 * the game to a particular conclusion, and every ending in the shipping table is
 * claimed by one of them. Two real defects were found by exactly this method and
 * would have survived any amount of unit testing:
 *
 *   - deaths at the hands of 天雷法相 / 业火魔相 were reported as 陨于斗法,
 *     because only 天诛神使 was named in the attribution list;
 *   - 声望 had no repeatable source, so no sect rank above the first was ever
 *     reached and 道统之主 was unreachable outright.
 *
 * The bots are deliberately unclever. They are not meant to be optimal, only to
 * demonstrate that an intent a player could plausibly hold does in fact arrive
 * somewhere. If a change to the balance makes one of these intents impossible,
 * that is a design decision, and it should be made deliberately by editing this
 * file rather than discovered by a player who never sees the ending.
 */

import { describe, expect, it } from 'vitest';
import { realmDef } from '@/data/realms';
import { sectById } from '@/data/sects';
import { mitigationOptions } from './calamity';
import { isReadyForBreakthrough } from './cultivation';
import { ALL_ENDING_IDS, canRetire, checkEndings } from './endings';
import { sectOffers, techniqueOffers } from './progression';
import { execute, type Command } from './turn';
import type { GameState } from './types';
import { forceRealm, newRun } from '@/test/helpers';

type Policy = (s: GameState) => Command;

// ============================================================================
// Shared bot vocabulary
// ============================================================================

/** Answer whatever mid-turn phase the bot finds itself in. `null` when free. */
function situational(s: GameState, spoils: '灭运' | '饶恕' | '搜刮'): Command | null {
  if (s.phase === 'combat') {
    if (s.combat?.awaitingSpoils) return { kind: '战利', choice: spoils };
    return { kind: '战斗', action: '出手' };
  }
  if (s.phase === 'event') {
    const options = s.pendingEvent?.options ?? [];
    const pick = options.find((o) => o.affordable) ?? options[0];
    return { kind: '抉择', choiceId: pick?.id ?? 'none' };
  }
  return null;
}

/** The affordable mitigation with the best 缓解×成算, ignoring 主动应劫. */
function bestMitigation(s: GameState): Command | null {
  const opts = mitigationOptions(s).filter((o) => o.affordable && o.id !== 'yingJie');
  if (opts.length === 0) return null;
  opts.sort((a, b) => (b.chance ?? 0) * b.relief - (a.chance ?? 0) * a.relief);
  return { kind: '化解劫运', mitigation: opts[0]!.id };
}

function joinIfPossible(s: GameState, route: string): Command | null {
  if (s.character!.sectId) return null;
  const offer = sectOffers(s).find((o) => o.eligible && sectById(o.id)?.route === route);
  return offer ? { kind: '入门派', sectId: offer.id } : null;
}

function learnIfPossible(s: GameState, route: string): Command | null {
  const offers = techniqueOffers(s).filter(
    (o) => !o.blocked && o.node.route === route && s.character!.spiritStones >= o.node.costStones,
  );
  if (offers.length === 0) return null;
  offers.sort((a, b) => a.node.tier - b.node.tier);
  return { kind: '习功法', techniqueId: offers[0]!.node.id };
}

// ============================================================================
// Policies — one plausible intent each
// ============================================================================

/** Head down, cultivate, break through, take what comes. */
const naive: Policy = (s) =>
  situational(s, '搜刮') ??
  (isReadyForBreakthrough(s.character!.realm)
    ? { kind: '突破' }
    : s.turn % 3 === 0
      ? { kind: '探索' }
      : { kind: '修炼' });

/** The same, but watches the meter. */
const cautious: Policy = (s) => {
  const sit = situational(s, '搜刮');
  if (sit) return sit;
  const c = s.character!;
  if (c.calamity.value >= 40) return bestMitigation(s) ?? { kind: '修炼' };
  if (isReadyForBreakthrough(c.realm)) return { kind: '突破' };
  return s.turn % 3 === 0 ? { kind: '探索' } : { kind: '修炼' };
};

/** 大梵寺 and the 佛 route: spare everyone, bank 功德, then close the books. */
const saint: Policy = (s) => {
  const sit = situational(s, '饶恕');
  if (sit) return sit;
  const c = s.character!;
  if (c.merit >= 400 && !canRetire(s)) return { kind: '归隐' };
  if (c.calamity.value >= 38) return bestMitigation(s) ?? { kind: '修炼' };
  return (
    joinIfPossible(s, 'fo') ??
    learnIfPossible(s, 'fo') ??
    (isReadyForBreakthrough(c.realm)
      ? { kind: '突破' }
      : c.hp < c.maxHp * 0.55
        ? { kind: '闭关' }
        : s.turn % 2 === 0
          ? { kind: '斗法' }
          : { kind: '修炼' })
  );
};

/** 血蕴宗 and the 魔 route: take every 气运 going, and pay for it. */
const butcher: Policy = (s) => {
  const sit = situational(s, '灭运');
  if (sit) return sit;
  const c = s.character!;
  // 灭运 charges 劫运 at 0.55× the victim's 气运; without a ceiling this bot
  // detonates long before it has taken enough to become anything.
  if (c.calamity.value >= 46) return bestMitigation(s) ?? { kind: '修炼' };
  if (isReadyForBreakthrough(c.realm)) return { kind: '突破' };
  return (
    joinIfPossible(s, 'mo') ??
    learnIfPossible(s, 'mo') ??
    (c.hp < c.maxHp * 0.6
      ? { kind: '闭关' }
      : s.turn % 3 === 0
        ? { kind: '修炼' }
        : { kind: '斗法' })
  );
};

/** 太一道 careerist: earn the 束脩, then duel for 声望 until the seal is yours. */
const climber: Policy = (s) => {
  const sit = situational(s, '搜刮');
  if (sit) return sit;
  const c = s.character!;
  // Stay under 太一's 劫运 ceiling of 58 so the door does not close.
  if (c.calamity.value >= 45) return bestMitigation(s) ?? { kind: '修炼' };
  return (
    joinIfPossible(s, 'dao') ??
    (isReadyForBreakthrough(c.realm)
      ? { kind: '突破' }
      : c.hp < c.maxHp * 0.55
        ? { kind: '闭关' }
        : s.turn % 2 === 0
          ? { kind: '斗法' }
          : { kind: '修炼' })
  );
};

/** Erase yourself: spend 气运 down through 隐匿气机, keep 劫运 flat, walk away. */
const eraser: Policy = (s) => {
  const sit = situational(s, '搜刮');
  if (sit) return sit;
  const c = s.character!;
  if (c.fortune <= 8 && c.calamity.value <= 10 && !canRetire(s)) return { kind: '归隐' };
  // 无录之人 is gated behind 窥命, so climb out of 引气 before erasing anything.
  if (isReadyForBreakthrough(c.realm)) return { kind: '突破' };
  if (realmDef(c.realm.realm).order < 2) return { kind: '修炼' };
  // 隐匿气机 is the one mitigation billed in 气运 — the exact meter to drain.
  const yin = mitigationOptions(s).find((o) => o.id === 'yinNi');
  if (c.fortune > 8 && yin?.affordable) return { kind: '化解劫运', mitigation: 'yinNi' };
  if (c.calamity.value > 10) return bestMitigation(s) ?? { kind: '修炼' };
  return c.hp < c.maxHp * 0.5 ? { kind: '闭关' } : { kind: '修炼' };
};

/** Ride out ten tribulations, then hang up a shingle. */
const jieyu: Policy = (s) => {
  const sit = situational(s, '搜刮');
  if (sit) return sit;
  const c = s.character!;
  if (c.calamity.survived + c.calamity.dissolved >= 10 && !canRetire(s)) return { kind: '归隐' };
  if (c.calamity.value >= 55) return bestMitigation(s) ?? { kind: '修炼' };
  if (c.hp < c.maxHp * 0.6) return { kind: '闭关' };
  if (isReadyForBreakthrough(c.realm)) return { kind: '突破' };
  return s.turn % 3 === 0 ? { kind: '探索' } : { kind: '修炼' };
};

/** Leave as soon as leaving is legal. */
const quitter: Policy = (s) => {
  const sit = situational(s, '搜刮');
  if (sit) return sit;
  if (!canRetire(s)) return { kind: '归隐' };
  return isReadyForBreakthrough(s.character!.realm) ? { kind: '突破' } : { kind: '修炼' };
};

const POLICIES: Record<string, Policy> = {
  naive,
  cautious,
  saint,
  butcher,
  climber,
  eraser,
  jieyu,
  quitter,
};

// ============================================================================
// Harness
// ============================================================================

function play(seed: string, policy: Policy, maxSteps = 3000): GameState {
  let state = newRun(seed);
  let steps = 0;
  while (!state.ending && steps < maxSteps) {
    const result = execute(state, policy(state));
    steps += 1;
    if (result.rejected) {
      // A stuck bot falls back to the one command that is always legal.
      const fallback = execute(state, { kind: '修炼' });
      if (fallback.rejected) break;
      state = fallback.state;
    } else {
      state = result.state;
    }
  }
  return state;
}

const SEEDS = Array.from({ length: 24 }, (_, i) => `reach-${i}`);

/** Every ending seen under one policy across the seed set. */
function endingsUnder(policy: Policy): Set<string> {
  const seen = new Set<string>();
  for (const seed of SEEDS) {
    const id = play(seed, policy).ending?.id;
    if (id) seen.add(id);
  }
  return seen;
}

// Surveying every policy is the expensive part; do it once and share it.
const SURVEY: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(POLICIES).map(([name, policy]) => [name, endingsUnder(policy)]),
);

const ALL_SEEN = new Set<string>(Object.values(SURVEY).flatMap((s) => [...s]));

/** The id `checkEndings` would award for this state right now. */
function checkEndingFor(s: GameState): string | undefined {
  return checkEndings(s)?.id;
}

// ============================================================================

describe('reachability · 结局可达', () => {
  it('every policy always arrives somewhere', () => {
    for (const [name, seen] of Object.entries(SURVEY)) {
      expect(seen.size, `${name} never finished a single life`).toBeGreaterThan(0);
    }
  });

  it.each([
    ['changsheng', '长生'],
    ['shouyuan', '寿元耗尽'],
    ['zhanwang', '陨于斗法'],
    ['posui', '破关而殒'],
    ['tianzhu', '天诛加身'],
    ['zouhuo', '走火入魔'],
    ['xinmo', '心魔噬心'],
    ['duoyun_mo', '夺运成魔'],
    ['gongde_yuanman', '功德圆满'],
    ['guiyin', '山中归隐'],
    ['wulu', '无录之人'],
    ['jieyu_daoshi', '劫余道师'],
    ['daotong', '道统之主'],
  ])('%s (%s) is reachable by playing', (id) => {
    expect(ALL_SEEN.has(id), `${id} was never reached by any of the ${Object.keys(POLICIES).length} policies`).toBe(true);
  });

  it('accounts for every shipping ending', () => {
    // 图录出世 is the secret ending and is covered by its own chain test below
    // rather than by survey, because it needs three destiny events to coincide.
    const unaccounted = ALL_ENDING_IDS.filter((id) => !ALL_SEEN.has(id) && id !== 'tulu_chushi');
    expect(unaccounted, `unreachable by any policy: ${unaccounted.join(', ')}`).toEqual([]);
  });

  it('lets intent steer the outcome — each build lands its own ending', () => {
    expect(SURVEY.saint!.has('gongde_yuanman'), '功德流 never retired fulfilled').toBe(true);
    expect(SURVEY.butcher!.has('duoyun_mo'), '魔道流 never fell').toBe(true);
    expect(SURVEY.eraser!.has('wulu'), '抹除流 never erased itself').toBe(true);
    expect(SURVEY.jieyu!.has('jieyu_daoshi'), '历劫流 never opened the 观').toBe(true);
    expect(SURVEY.quitter!.has('guiyin'), '归隐流 never got to leave').toBe(true);
  });

  it('does not let one ending swallow the run — no policy is a monoculture', () => {
    for (const [name, seen] of Object.entries(SURVEY)) {
      // 归隐流 is single-minded on purpose; everyone else should vary.
      if (name === 'quitter') continue;
      expect(seen.size, `${name} only ever reaches ${[...seen]}`).toBeGreaterThan(1);
    }
  });
});

describe('reachability · 死因归属', () => {
  it('blames the 劫 for a death under any 劫相, not a duel', () => {
    // 天雷法相 and 业火魔相 are 劫数所化 exactly as 天诛神使 is. Naming only the
    // last of them made most calamity deaths read as 陨于斗法.
    for (const slayer of ['tianlei', 'yehuo', 'tianzhu']) {
      const s = forceRealm(newRun(`slain-by-${slayer}`), 'yuanshen');
      s.character!.hp = 0;
      s.character!.flags.slainBy = slayer;
      expect(checkEndingFor(s), `${slayer} should read as 天诛`).toBe('tianzhu');
    }
  });

  it('still blames the duel when an ordinary cultivator did it', () => {
    for (const slayer of ['yaolang', 'xuezhidao']) {
      const s = forceRealm(newRun(`duel-${slayer}`), 'tongxuan');
      s.character!.hp = 0;
      s.character!.flags.slainBy = slayer;
      expect(checkEndingFor(s)).toBe('zhanwang');
    }
  });

  it('keeps 心魔 its own ending rather than folding it into 天诛', () => {
    const s = forceRealm(newRun('slain-by-xinmo'), 'tongxuan');
    s.character!.hp = 0;
    s.character!.flags.slainBy = 'xinmo';
    expect(checkEndingFor(s)).toBe('xinmo');
  });
});

describe('reachability · 图录出世', () => {
  it('opens the hidden route only once the three卷 have woken', () => {
    const closed = forceRealm(newRun('tulu-closed'), 'yuanshen');
    expect(techniqueOffers(closed).some((o) => o.node.route === 'tulu')).toBe(false);

    const open = forceRealm(newRun('tulu-open'), 'yuanshen');
    open.character!.flags.tuluAwake = true;
    expect(techniqueOffers(open).some((o) => o.node.route === 'tulu')).toBe(true);
  });

  it('walks the whole 图录 ladder with real 习功法 commands and ends 出世', () => {
    let s = forceRealm(newRun('tulu-chain'), 'yuanshen');
    s.character!.flags.tuluAwake = true;
    s.character!.spiritStones = 500_000;

    // The route stacks on top of whatever trunk the character already walks, so
    // each node must be learnable in sequence through the ordinary command path.
    for (const id of ['tulu1n', 'tulu2n', 'tulu3n']) {
      let learned = false;
      for (let attempt = 0; attempt < 200 && !learned; attempt++) {
        const before = s.character!.learned.length;
        const r = execute(s, { kind: '习功法', techniqueId: id });
        if (!r.rejected) {
          s = r.state;
          learned = s.character!.learned.length > before;
        }
        if (s.ending) break;
        s.character!.hp = s.character!.maxHp;
        s.character!.calamity.value = 0;
        s.character!.spiritStones = 500_000;
      }
      expect(learned, `${id} could not be learned through 习功法`).toBe(true);
    }

    s = forceRealm(s, 'changsheng');
    expect(checkEndingFor(s)).toBe('tulu_chushi');
  });
});