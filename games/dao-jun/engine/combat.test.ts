import { describe, expect, it } from 'vitest';
import {
  CHARGE_SOUL_COST,
  FOES,
  MAX_COMBAT_ROUNDS,
  SOUL_GRIP_COST,
  availableTactics,
  bestElixir,
  eligibleFoes,
  getFoe,
  tacticAvailability,
} from './combat';
import { ITEMS } from './content';
import { actionAvailability, fightRound, performAction } from './game';
import { newGame } from './testkit';
import { COMBAT_TACTICS, type CombatTactic, type GameState } from './types';

/** Start a duel and hand back the state sitting in the combat phase. */
function engage(seed = 3, mutate: (state: GameState) => void = () => {}): GameState {
  const state = newGame({}, seed);
  mutate(state);
  const result = performAction(state, '斗法');
  expect(result.ok).toBe(true);
  return result.state;
}

/** Start a duel, then swap in a named foe so the exit under test is forced. */
function engageWith(foeId: string, mutate: (state: GameState) => void = () => {}): GameState {
  const state = engage(3);
  const foe = getFoe(foeId)!;
  state.combat = { ...state.combat!, foeId, foeHp: foe.hp, foeMaxHp: foe.hp };
  mutate(state);
  return state;
}

function fightToTheEnd(
  state: GameState,
  tactic: CombatTactic | ((s: GameState) => CombatTactic),
): GameState {
  let current = state;
  let guard = MAX_COMBAT_ROUNDS + 5;
  while (current.combat && !current.ending && guard > 0) {
    guard -= 1;
    const wanted = typeof tactic === 'function' ? tactic(current) : tactic;
    const attempt = fightRound(current, wanted);
    current = attempt.ok ? attempt.state : fightRound(current, '力破').state;
  }
  return current;
}

describe('foe roster', () => {
  it('ships at least ten foes with unique ids', () => {
    expect(FOES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(FOES.map((foe) => foe.id)).size).toBe(FOES.length);
  });

  it('covers every realm tier up to 合道', () => {
    for (let tier = 0; tier <= 5; tier += 1) {
      expect(FOES.some((foe) => foe.tier === tier)).toBe(true);
    }
  });

  it('only drops items that exist in the item table', () => {
    const known = new Set(ITEMS.map((item) => item.id));
    expect(FOES.filter((foe) => foe.loot).every((foe) => known.has(foe.loot!))).toBe(true);
  });

  it('includes both 劫财 and 夺命 tiers', () => {
    expect(FOES.some((foe) => !foe.lethal)).toBe(true);
    expect(FOES.some((foe) => foe.lethal)).toBe(true);
  });

  it('scales power and health with tier', () => {
    const avg = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const tier0 = FOES.filter((foe) => foe.tier === 0);
    const tier5 = FOES.filter((foe) => foe.tier === 5);
    expect(avg(tier5.map((foe) => foe.hp))).toBeGreaterThan(avg(tier0.map((foe) => foe.hp)));
    expect(avg(tier5.map((foe) => foe.power))).toBeGreaterThan(avg(tier0.map((foe) => foe.power)));
  });

  it('only offers foes the current realm has unlocked', () => {
    for (let realm = 0; realm <= 5; realm += 1) {
      expect(eligibleFoes(realm).every((foe) => foe.tier <= realm)).toBe(true);
    }
    expect(eligibleFoes(0).length).toBeGreaterThan(0);
  });

  it('drops the weakest tiers once better ones exist', () => {
    expect(eligibleFoes(4).some((foe) => foe.tier === 0)).toBe(false);
  });
});

describe('combat phase lock', () => {
  it('opens a duel instead of resolving 斗法 in one roll', () => {
    const state = engage();
    expect(state.combat).not.toBeNull();
    expect(state.combat!.round).toBe(1);
    expect(state.combat!.foeHp).toBe(state.combat!.foeMaxHp);
  });

  it('holds the turn open until the duel resolves', () => {
    const state = engage();
    expect(state.turn).toBe(0);
    expect(fightToTheEnd(state, '力破').turn).toBe(1);
  });

  it('blocks every core action while a foe is standing', () => {
    const state = engage();
    for (const action of ['悟道', '调息', '斗法', '占地'] as const) {
      expect(actionAvailability(state, action)).toMatchObject({
        available: false,
        reason: '先了结眼前这一战',
      });
    }
  });

  it('refuses combat commands when no duel is open', () => {
    expect(fightRound(newGame(), '力破')).toMatchObject({ ok: false, message: '并无对敌' });
  });

  it('spends qi to pick the fight', () => {
    expect(engage().character.qi).toBe(newGame({}, 3).character.qi - 8);
  });

  it('rolls an event only once the duel is over', () => {
    const state = engage();
    expect(state.pendingEvent).toBeNull();
    expect(fightToTheEnd(state, '力破').pendingEvent).not.toBeNull();
  });
});

describe('tactics', () => {
  it('offers the six distinct 战斗式', () => {
    expect(COMBAT_TACTICS).toEqual(['力破', '周旋', '布纹', '摄神', '吞丹', '遁土']);
    expect(new Set(COMBAT_TACTICS).size).toBe(6);
  });

  it('always leaves at least three tactics on the table', () => {
    expect(availableTactics(engage()).length).toBeGreaterThanOrEqual(3);
  });

  it('gates 布纹 behind its soul cost', () => {
    const state = engage(3, (draft) => {
      draft.soul.power = CHARGE_SOUL_COST - 1;
    });
    expect(tacticAvailability(state, '布纹')).toMatchObject({ available: false });
  });

  it('spends soul to bank a charge', () => {
    const state = engage();
    expect(fightRound(state, '布纹').state.soul.power).toBe(state.soul.power - CHARGE_SOUL_COST);
  });

  it('will not stack a second charge on a banked one', () => {
    let state = engageWith('stray-cutpurse', (draft) => {
      draft.combat!.foeHp = 100000;
      draft.daoPattern.harmony = 100;
    });
    // A fizzled 凝雷 costs the soul but banks nothing, so keep at it until one holds.
    for (let i = 0; i < 12 && !state.combat!.charged; i += 1) {
      state.soul.power = state.soul.maxPower;
      state.character.health = state.character.maxHealth;
      state = fightRound(state, '布纹').state;
    }
    expect(state.combat!.charged).toBe(true);
    expect(tacticAvailability(state, '布纹')).toMatchObject({ available: false, reason: '蓄势已成' });
  });

  it('hurts the foe less on 周旋 than on 力破', () => {
    const state = engage(5);
    const dealt = (next: GameState) => state.combat!.foeHp - (next.combat?.foeHp ?? 0);
    expect(dealt(fightRound(state, '周旋').state)).toBeLessThan(
      dealt(fightRound(state, '力破').state),
    );
  });

  it('takes less damage on 周旋 than on 力破', () => {
    const state = engage(5);
    expect(fightRound(state, '周旋').state.character.health).toBeGreaterThan(
      fightRound(state, '力破').state.character.health,
    );
  });

  it('cashes a banked charge into a heavier blow', () => {
    const charged = engageWith('stray-cutpurse', (draft) => {
      draft.combat!.foeHp = 100000;
      draft.combat!.charged = true;
    });
    const plain = engageWith('stray-cutpurse', (draft) => {
      draft.combat!.foeHp = 100000;
    });
    const dealt = (before: GameState, after: GameState) => before.combat!.foeHp - after.combat!.foeHp;
    expect(dealt(charged, fightRound(charged, '力破').state)).toBeGreaterThan(
      dealt(plain, fightRound(plain, '力破').state),
    );
  });

  it('records a D20 for the attack roll', () => {
    const state = fightRound(engage(), '力破').state;
    expect(state.rolls.some((entry) => entry.die === 'D20' && entry.reason.includes('力破'))).toBe(true);
  });

  it('refuses 遁土 against a foe that sealed the exits', () => {
    const state = engageWith('ruin-puppet', (draft) => {
      draft.combat!.foeHp = 100000;
    });
    expect(tacticAvailability(state, '遁土')).toMatchObject({
      available: false,
      reason: '退路已被封死',
    });
  });

  it('advances the round counter when nobody drops', () => {
    const state = engageWith('stray-cutpurse', (draft) => {
      draft.combat!.foeHp = 100000;
    });
    expect(fightRound(state, '周旋').state.combat!.round).toBe(2);
  });

  it('gates 摄神 behind its soul cost', () => {
    const state = engage(3, (draft) => {
      draft.soul.power = SOUL_GRIP_COST - 1;
    });
    expect(tacticAvailability(state, '摄神')).toMatchObject({
      available: false,
      reason: `需 ${SOUL_GRIP_COST} 神魂`,
    });
  });

  it('spends soul on a 摄神 grip', () => {
    const state = engageWith('stray-cutpurse', (draft) => {
      draft.combat!.foeHp = 100000;
      draft.soul.power = draft.soul.maxPower;
    });
    expect(fightRound(state, '摄神').state.soul.power).toBe(state.soul.power - SOUL_GRIP_COST);
  });

  it('lets 摄神 bite through a guard that blunts 力破', () => {
    // 天门使者 wears the heaviest guard in the roster; a soul-grip ignores it.
    const arm = (draft: GameState) => {
      draft.combat!.foeHp = 100000;
      draft.soul.maxPower = 400;
      draft.soul.power = 400;
      draft.soul.stability = 100;
    };
    const soulish = engageWith('heaven-envoy', arm);
    const bodily = engageWith('heaven-envoy', arm);
    const dealt = (before: GameState, after: GameState) => before.combat!.foeHp - after.combat!.foeHp;
    expect(dealt(soulish, fightRound(soulish, '摄神').state)).toBeGreaterThan(
      dealt(bodily, fightRound(bodily, '力破').state),
    );
  });

  it('refuses 吞丹 with an empty bag', () => {
    const state = engageWith('stray-cutpurse', (draft) => {
      draft.combat!.foeHp = 100000;
      draft.inventory = [];
      draft.character.health = 10;
    });
    expect(tacticAvailability(state, '吞丹')).toMatchObject({ available: false, reason: '囊中无丹' });
  });

  it('refuses 吞丹 at full health', () => {
    const state = engageWith('stray-cutpurse', (draft) => {
      draft.combat!.foeHp = 100000;
      draft.inventory = ['healing-pill'];
      draft.character.health = draft.character.maxHealth;
    });
    expect(tacticAvailability(state, '吞丹')).toMatchObject({ available: false, reason: '气血无损' });
  });

  it('reaches for the strongest elixir on 吞丹 and eats a free swing', () => {
    const state = engageWith('stray-cutpurse', (draft) => {
      draft.combat!.foeHp = 100000;
      draft.inventory = ['healing-pill', 'longevity-fruit'];
      draft.character.health = 10;
    });
    expect(bestElixir(state)!.id).toBe('longevity-fruit');
    const after = fightRound(state, '吞丹').state;
    expect(after.inventory).toEqual(['healing-pill']);
    // Healed 40, then struck back by a tier-0 foe: still well up on 10.
    expect(after.character.health).toBeGreaterThan(state.character.health);
    expect(after.combat!.foeHp).toBe(state.combat!.foeHp);
  });
});

describe('combat exits', () => {
  it('wins, takes loot, and gains renown', () => {
    const state = engageWith('stray-cutpurse', (draft) => {
      draft.combat!.foeHp = 1;
      draft.territory.spiritStones = 100;
    });
    const after = fightToTheEnd(state, '力破');
    expect(after.combat).toBeNull();
    expect(after.territory.spiritStones).toBeGreaterThan(100);
    expect(after.character.reputation).toBeGreaterThan(state.character.reputation);
    expect(after.ending).toBeNull();
  });

  it('robs but does not kill when a 劫财 foe wins', () => {
    const state = engageWith('stray-cutpurse', (draft) => {
      draft.combat!.foeHp = 100000;
      draft.character.health = 1;
      draft.territory.spiritStones = 400;
    });
    const after = fightToTheEnd(state, '力破');
    expect(after.combat).toBeNull();
    expect(after.character.health).toBeGreaterThan(0);
    expect(after.territory.spiritStones).toBeLessThan(400);
    expect(after.soul.stability).toBe(state.soul.stability - 6);
    expect(after.ending).toBeNull();
  });

  it('kills outright when a 夺命 foe wins', () => {
    const state = engageWith('soul-eater', (draft) => {
      draft.combat!.foeHp = 100000;
      draft.character.health = 1;
    });
    const after = fightToTheEnd(state, '力破');
    expect(after.combat).toBeNull();
    expect(after.ending).toBe('death');
  });

  it('lets a cultivator disengage', () => {
    let state = engageWith('stray-cutpurse', (draft) => {
      draft.combat!.foeHp = 100000;
      draft.territory.influence = 90;
    });
    let guard = 8;
    while (state.combat && guard > 0) {
      guard -= 1;
      state = fightRound(state, '遁土').state;
    }
    expect(state.combat).toBeNull();
    expect(state.character.health).toBeGreaterThan(0);
    expect(state.turn).toBe(1);
  });

  it('calls a draw once the duel outlasts the round cap', () => {
    let state = engageWith('stray-cutpurse', (draft) => {
      draft.combat!.foeHp = 100000;
      draft.character.maxHealth = 100000;
      draft.character.health = 100000;
    });
    let rounds = 0;
    while (state.combat && rounds < MAX_COMBAT_ROUNDS + 4) {
      rounds += 1;
      state = fightRound(state, '周旋').state;
    }
    expect(rounds).toBe(MAX_COMBAT_ROUNDS);
    expect(state.combat).toBeNull();
    expect(state.turn).toBe(1);
  });

  it('narrates each round into the duel log', () => {
    expect((fightRound(engage(), '力破').state.combat?.log ?? []).length).toBeGreaterThan(0);
  });

  it('replays identically for the same seed and tactic sequence', () => {
    const play = () => fightToTheEnd(engage(88), (s) => (s.combat!.round % 2 ? '力破' : '周旋'));
    expect(JSON.stringify(play())).toBe(JSON.stringify(play()));
  });
});
