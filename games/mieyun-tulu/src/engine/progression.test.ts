import { describe, expect, it } from 'vitest';
import { SECTS, sectById } from '@/data/sects';
import { TECHNIQUES } from '@/data/techniques';
import { derive } from './derived';
import {
  joinSect,
  learnChance,
  learnTechnique,
  leaveSect,
  sectOffers,
  sectRankTitle,
  sectUpkeep,
  techniqueOffers,
} from './progression';
import { countItem } from './util';
import { forceRealm, newRun } from '@/test/helpers';

/** Learn a node without gambling on the D100 — used to build prerequisites. */
function grant(state: ReturnType<typeof newRun>, ...ids: string[]) {
  const c = state.character!;
  for (const id of ids) {
    if (!c.learned.includes(id)) c.learned.push(id);
    const node = TECHNIQUES.find((t) => t.id === id)!;
    if (node.tier === 1 && node.route !== 'tulu') c.routeId = node.route;
  }
  return state;
}

describe('progression · 功法', () => {
  it('offers all four open trunks to a fresh cultivator', () => {
    const s = forceRealm(newRun('offers'), 'yinqi');
    const trunks = techniqueOffers(s).filter((o) => o.node.tier === 1);
    expect(trunks.map((t) => t.node.route).sort()).toEqual(['dao', 'fo', 'mo', 'ru']);
  });

  it('hides the 图录 route until the卷 wake', () => {
    const s = forceRealm(newRun('hidden'), 'tongxuan');
    expect(techniqueOffers(s).some((o) => o.node.route === 'tulu')).toBe(false);
    s.character!.flags.tuluAwake = true;
    expect(techniqueOffers(s).some((o) => o.node.id === 'tulu1n')).toBe(true);
  });

  it('closes the other trunks once a route is chosen', () => {
    const s = grant(forceRealm(newRun('commit'), 'yinqi'), 'dao1');
    const trunks = techniqueOffers(s).filter((o) => o.node.tier === 1);
    expect(trunks.every((o) => o.node.route === 'tulu')).toBe(true);
  });

  it('lets 图录 stack on top of a committed route', () => {
    const s = grant(forceRealm(newRun('stack'), 'tongxuan'), 'dao1');
    s.character!.flags.tuluAwake = true;
    expect(techniqueOffers(s).some((o) => o.node.id === 'tulu1n')).toBe(true);
  });

  it('withholds a branch until its prerequisite is in hand', () => {
    const s = forceRealm(newRun('prereq'), 'tongxuan');
    expect(techniqueOffers(s).some((o) => o.node.id === 'dao2a')).toBe(false);
    grant(s, 'dao1');
    expect(techniqueOffers(s).some((o) => o.node.id === 'dao2a')).toBe(true);
  });

  it('marks a realm-gated offer blocked rather than hiding it', () => {
    const s = grant(forceRealm(newRun('gate'), 'yinqi'), 'dao1');
    const offer = techniqueOffers(s).find((o) => o.node.id === 'dao2a');
    expect(offer?.blocked).toContain('通玄');
  });

  it('publishes a learn chance inside 5–95 that falls with difficulty', () => {
    const s = forceRealm(newRun('chance'), 'yuanshen');
    for (const node of TECHNIQUES) {
      const c = learnChance(s, node);
      expect(c).toBeGreaterThanOrEqual(5);
      expect(c).toBeLessThanOrEqual(95);
    }
    const easy = TECHNIQUES.find((t) => t.id === 'dao1')!;
    const hard = TECHNIQUES.find((t) => t.id === 'dao3a')!;
    expect(learnChance(s, hard)).toBeLessThan(learnChance(s, easy));
  });

  it('gives 书生 a better chance than a 赤猴 at the same book', () => {
    const scholar = forceRealm(newRun('learn-cmp', { originId: 'shusheng' }), 'yinqi');
    const brawler = forceRealm(newRun('learn-cmp', { originId: 'chihou' }), 'yinqi');
    const node = TECHNIQUES.find((t) => t.id === 'dao1')!;
    expect(learnChance(scholar, node)).toBeGreaterThan(learnChance(brawler, node));
    expect(derive(scholar.character!).learningBonus).toBeGreaterThan(
      derive(brawler.character!).learningBonus,
    );
  });

  it('charges the stones whether the study succeeds or fails', () => {
    const s = forceRealm(newRun('tuition'), 'yinqi');
    s.character!.spiritStones = 1000;
    learnTechnique(s, 'dao1');
    expect(s.character!.spiritStones).toBe(700);
  });

  it('refuses when the purse is short and takes nothing', () => {
    const s = forceRealm(newRun('broke'), 'yinqi');
    s.character!.spiritStones = 10;
    expect(learnTechnique(s, 'dao1')[0]!.text).toContain('灵石不足');
    expect(s.character!.spiritStones).toBe(10);
    expect(s.character!.learned).not.toContain('dao1');
  });

  it('refuses a book that is off the chosen route', () => {
    const s = grant(forceRealm(newRun('offroute'), 'yinqi'), 'dao1');
    s.character!.spiritStones = 100000;
    expect(learnTechnique(s, 'mo1')[0]!.text).toContain('无缘');
    expect(s.character!.learned).not.toContain('mo1');
  });

  it('commits the route and raises the numbers when a trunk lands', () => {
    let learned = false;
    for (let i = 0; i < 40 && !learned; i++) {
      const s = forceRealm(newRun(`trunk-${i}`), 'yinqi');
      s.character!.spiritStones = 1000;
      learnTechnique(s, 'dao1');
      if (s.character!.learned.includes('dao1')) {
        learned = true;
        expect(s.character!.routeId).toBe('dao');
        expect(derive(s.character!).cultivationMult).toBeGreaterThan(0);
        expect(derive(s.character!).calamityRate).toBeLessThan(
          derive(forceRealm(newRun(`trunk-${i}`), 'yinqi').character!).calamityRate,
        );
      }
    }
    expect(learned).toBe(true);
  });

  it('says so and does nothing when the book is already known', () => {
    const s = grant(forceRealm(newRun('dup'), 'yinqi'), 'dao1');
    s.character!.spiritStones = 1000;
    expect(learnTechnique(s, 'dao1')[0]!.text).toContain('已在身');
    expect(s.character!.spiritStones).toBe(1000);
  });

  it('rejects an unknown technique id', () => {
    expect(learnTechnique(newRun('nosuch'), 'not-a-book')[0]!.text).toContain('无此功法');
  });
});

describe('progression · 门派', () => {
  it('turns away a 凡尘 applicant everywhere', () => {
    const s = newRun('mortal-apply');
    s.character!.spiritStones = 100000;
    expect(sectOffers(s).every((o) => !o.eligible)).toBe(true);
  });

  it('turns away 大梵寺 applicants carrying too much 劫运', () => {
    const s = forceRealm(newRun('dirty'), 'tongxuan');
    s.character!.merit = 100;
    s.character!.calamity.value = 90;
    const dafan = sectOffers(s).find((o) => o.id === 'dafan')!;
    expect(dafan.eligible).toBe(false);
    expect(dafan.reason).toContain('劫运过重');
  });

  it('turns away 稷下 applicants short on 功德', () => {
    const s = forceRealm(newRun('unmerited'), 'tongxuan');
    s.character!.merit = -50;
    s.character!.spiritStones = 100000;
    expect(sectOffers(s).find((o) => o.id === 'jixia')!.reason).toContain('功德不足');
  });

  it('keeps 阴阳家 shut to anyone without a 图录 trace', () => {
    const s = forceRealm(newRun('yinyang'), 'tongxuan');
    s.character!.spiritStones = 100000;
    expect(sectOffers(s).find((o) => o.id === 'yinyang')!.reason).toContain('不收生人');
    s.character!.flags.tuluTrace = true;
    expect(sectOffers(s).find((o) => o.id === 'yinyang')!.eligible).toBe(true);
  });

  it('takes the tuition and starts the member unranked', () => {
    const s = forceRealm(newRun('join'), 'tongxuan');
    s.character!.spiritStones = 1000;
    joinSect(s, 'taiyi');
    expect(s.character!.sectId).toBe('taiyi');
    expect(s.character!.sectRankIndex).toBe(-1);
    expect(s.character!.spiritStones).toBe(1000 - sectById('taiyi')!.tuition);
    expect(sectRankTitle(s)).toBeNull();
  });

  it('narrows the market spread for members', () => {
    const s = forceRealm(newRun('discount'), 'tongxuan');
    s.character!.spiritStones = 1000;
    const before = derive(s.character!).marketDiscount;
    joinSect(s, 'jixia');
    expect(derive(s.character!).marketDiscount).toBeGreaterThan(before);
  });

  it('pays a stipend every upkeep and books it as income', () => {
    const s = forceRealm(newRun('stipend'), 'tongxuan');
    s.character!.spiritStones = 1000;
    joinSect(s, 'taiyi');
    const purse = s.character!.spiritStones;
    const earned = s.stats.stonesEarned;
    sectUpkeep(s);
    expect(s.character!.spiritStones).toBe(purse + sectById('taiyi')!.stipend);
    expect(s.stats.stonesEarned).toBe(earned + sectById('taiyi')!.stipend);
  });

  it('promotes through every rank the 声望 ledger has already earned', () => {
    const s = forceRealm(newRun('promote'), 'tongxuan');
    s.character!.spiritStones = 1000;
    joinSect(s, 'taiyi');
    s.character!.reputation = 400;
    sectUpkeep(s);
    expect(s.character!.sectRankIndex).toBe(3);
    expect(sectRankTitle(s)).toBe('道子');
    expect(countItem(s.character!.inventory, 'zhenhunling')).toBeGreaterThan(0);
  });

  it('does not promote past what 声望 has paid for', () => {
    const s = forceRealm(newRun('slow'), 'tongxuan');
    s.character!.spiritStones = 1000;
    joinSect(s, 'taiyi');
    s.character!.reputation = 30;
    sectUpkeep(s);
    expect(s.character!.sectRankIndex).toBe(0);
    sectUpkeep(s);
    expect(s.character!.sectRankIndex).toBe(0);
  });

  it('costs reputation and 功德 to walk out', () => {
    const s = forceRealm(newRun('leave'), 'tongxuan');
    s.character!.spiritStones = 1000;
    joinSect(s, 'taiyi');
    s.character!.reputation = 100;
    s.character!.merit = 50;
    leaveSect(s);
    expect(s.character!.sectId).toBeNull();
    expect(s.character!.reputation).toBe(40);
    expect(s.character!.merit).toBe(40);
  });

  it('pays nothing to the sectless', () => {
    const s = forceRealm(newRun('sectless'), 'tongxuan');
    const purse = s.character!.spiritStones;
    expect(sectUpkeep(s)).toEqual([]);
    expect(s.character!.spiritStones).toBe(purse);
    expect(leaveSect(s)[0]!.text).toContain('无门无派');
  });

  it('gives every sect a four-rung ladder with rising requirements', () => {
    for (const sect of SECTS) {
      expect(sect.ranks).toHaveLength(4);
      for (let i = 1; i < sect.ranks.length; i++) {
        expect(sect.ranks[i]!.reputation).toBeGreaterThan(sect.ranks[i - 1]!.reputation);
      }
    }
  });
});
