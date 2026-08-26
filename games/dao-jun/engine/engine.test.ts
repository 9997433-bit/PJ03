import { describe, expect, it } from 'vitest';
import {
  ACTIONS,
  ENDINGS,
  EVENTS,
  ITEMS,
  REALMS,
  actionAvailability,
  canClaim,
  canEngrave,
  canSpendSoul,
  chance,
  chooseEvent,
  claimDifficulty,
  claimTerritory,
  comprehend,
  createDaoPattern,
  createGame,
  createSoul,
  createTerritory,
  engravePattern,
  evaluateEnding,
  getEnding,
  harmonize,
  harvestTerritory,
  insightNeeded,
  loseTerritory,
  nextRandom,
  normalizeSeed,
  patternPower,
  patternsForBreakthrough,
  performAction,
  restoreSoul,
  rollInt,
  shakeSoul,
  soulCombatPower,
  spendSoul,
  temperSoul,
  territoryPower,
  totalPower,
  useItem,
  type CoreAction,
  type CreationOptions,
  type GameState,
} from './index';

const options: CreationOptions = { name: '宁玄', origin: 'mountain', path: '剑', vow: 'guard' };
const fresh = (seed = 1) => createGame(options, seed);
const settle = (state: GameState) => state.pendingEvent ? chooseEvent(state, 1).state : state;

describe('seeded random engine', () => {
  it('returns the same roll for the same seed', () => {
    expect(nextRandom(42)).toEqual(nextRandom(42));
  });

  it('advances the random seed', () => {
    expect(nextRandom(42).seed).not.toBe(42);
  });

  it('always returns values in [0, 1)', () => {
    for (let seed = 1; seed < 50; seed += 1) {
      const value = nextRandom(seed).value;
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('rollInt includes both requested bounds', () => {
    const rolls = Array.from({ length: 1000 }, (_, seed) => rollInt(seed + 1, 3, 5).value);
    expect(Math.min(...rolls)).toBe(3);
    expect(Math.max(...rolls)).toBe(5);
  });

  it('chance clamps probability below zero', () => {
    expect(chance(8, -5).value).toBe(0);
  });

  it('chance clamps probability above one', () => {
    expect(chance(8, 5).value).toBe(1);
  });

  it('normalizes invalid and zero seeds', () => {
    expect(normalizeSeed(Number.NaN)).toBe(1);
    expect(normalizeSeed(0)).toBe(1);
    expect(normalizeSeed(-8)).toBe(8);
  });
});

describe('daoPattern module', () => {
  it('creates an unengraved pattern state', () => {
    expect(createDaoPattern()).toEqual({ insight: 0, engraved: 0, harmony: 50, namedPatterns: [] });
  });

  it('starts with a twelve-insight engraving requirement', () => {
    expect(insightNeeded(0)).toBe(12);
  });

  it('increases engraving cost by four each time', () => {
    expect(insightNeeded(5)).toBe(32);
  });

  it('adds integer insight through comprehension', () => {
    expect(comprehend(createDaoPattern(), 7.9).insight).toBe(7);
  });

  it('does not allow engraving without enough insight', () => {
    expect(canEngrave(createDaoPattern())).toBe(false);
  });

  it('allows engraving at the exact threshold', () => {
    expect(canEngrave({ ...createDaoPattern(), insight: 12 })).toBe(true);
  });

  it('spends insight and adds a named sword pattern', () => {
    const result = engravePattern({ ...createDaoPattern(), insight: 12 }, '剑');
    expect(result.engraved).toBe(1);
    expect(result.insight).toBe(0);
    expect(result.namedPatterns[0]).toContain('剑纹');
  });

  it('does not mutate a pattern when engraving is unavailable', () => {
    const pattern = createDaoPattern();
    expect(engravePattern(pattern, '法')).toBe(pattern);
  });

  it('calculates greater power for additional engravings', () => {
    expect(patternPower({ ...createDaoPattern(), engraved: 2 })).toBeGreaterThan(patternPower(createDaoPattern()));
  });

  it('requires one more pattern at each realm', () => {
    expect([0, 1, 2, 3].map(patternsForBreakthrough)).toEqual([1, 2, 3, 4]);
  });

  it('clamps harmony to its valid range', () => {
    expect(harmonize(createDaoPattern(), 80).harmony).toBe(100);
    expect(harmonize(createDaoPattern(), -80).harmony).toBe(0);
  });
});

describe('soulPower module', () => {
  it('gives the soul path a larger starting soul', () => {
    expect(createSoul('神').maxPower).toBeGreaterThan(createSoul('剑').maxPower);
  });

  it('gives the spell path a modest starting bonus', () => {
    expect(createSoul('法').maxPower).toBe(58);
  });

  it('checks whether soul power can be spent', () => {
    expect(canSpendSoul(createSoul('剑'), 50)).toBe(true);
    expect(canSpendSoul(createSoul('剑'), 51)).toBe(false);
  });

  it('spends soul and slightly reduces stability', () => {
    const result = spendSoul(createSoul('剑'), 16);
    expect(result.power).toBe(34);
    expect(result.stability).toBe(53);
  });

  it('refuses overspending without mutating the state', () => {
    const soul = createSoul('剑');
    expect(spendSoul(soul, 99)).toBe(soul);
  });

  it('restores no more than maximum power', () => {
    const soul = spendSoul(createSoul('剑'), 10);
    expect(restoreSoul(soul, 99).power).toBe(50);
  });

  it('tempering increases maximum soul power', () => {
    expect(temperSoul(createSoul('剑'), 12).maxPower).toBe(62);
  });

  it('soul shock never produces negative values', () => {
    const result = shakeSoul(createSoul('剑'), 999);
    expect(result.power).toBe(0);
    expect(result.stability).toBe(0);
  });

  it('gives the soul path an affinity in combat', () => {
    const sameSoul = createSoul('剑');
    expect(soulCombatPower(sameSoul, '神')).toBeGreaterThan(soulCombatPower(sameSoul, '剑'));
  });
});

describe('territory module', () => {
  it('creates a landless but supplied starting territory', () => {
    const territory = createTerritory();
    expect(territory.nodes).toBe(0);
    expect(territory.food).toBeGreaterThan(0);
  });

  it('raises claim difficulty for each node', () => {
    expect(claimDifficulty(3)).toBeGreaterThan(claimDifficulty(0));
  });

  it('allows a supplied territory to claim land', () => {
    expect(canClaim(createTerritory())).toBe(true);
  });

  it('blocks claiming when food is scarce', () => {
    expect(canClaim({ ...createTerritory(), food: 9 })).toBe(false);
  });

  it('adds a node after a successful claim', () => {
    expect(claimTerritory(createTerritory(), 5).nodes).toBe(1);
  });

  it('charges food after a successful claim', () => {
    expect(claimTerritory(createTerritory(), 5).food).toBe(70);
  });

  it('does not claim on a negative margin', () => {
    const territory = createTerritory();
    expect(claimTerritory(territory, -1)).toBe(territory);
  });

  it('reduces control after losing a contest', () => {
    expect(loseTerritory(createTerritory(), 8).control).toBe(22);
  });

  it('harvests more food from more nodes', () => {
    const empty = harvestTerritory(createTerritory()).food;
    const settled = harvestTerritory({ ...createTerritory(), nodes: 3 }).food;
    expect(settled).toBeGreaterThan(empty);
  });

  it('calculates power from control, influence, and nodes', () => {
    const base = territoryPower(createTerritory());
    expect(territoryPower({ ...createTerritory(), nodes: 2, influence: 20 })).toBeGreaterThan(base);
  });
});

describe('content integrity', () => {
  it('ships at least thirty events', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(30);
  });

  it('ships at least twenty items', () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(20);
  });

  it('ships at least ten endings', () => {
    expect(ENDINGS.length).toBeGreaterThanOrEqual(10);
  });

  it('uses unique event ids', () => {
    expect(new Set(EVENTS.map((event) => event.id)).size).toBe(EVENTS.length);
  });

  it('uses unique item ids', () => {
    expect(new Set(ITEMS.map((item) => item.id)).size).toBe(ITEMS.length);
  });

  it('uses unique ending ids', () => {
    expect(new Set(ENDINGS.map((ending) => ending.id)).size).toBe(ENDINGS.length);
  });

  it('gives every event exactly two meaningful choices', () => {
    expect(EVENTS.every((event) => event.choices.length === 2 && event.choices.every((item) => item.label && item.result))).toBe(true);
  });

  it('provides events for every core action', () => {
    for (const action of ACTIONS) {
      expect(EVENTS.some((event) => event.actions.includes(action))).toBe(true);
    }
  });

  it('only awards item ids that exist in the item table', () => {
    const known = new Set(ITEMS.map((item) => item.id));
    const awards = EVENTS.flatMap((event) => event.choices.map((item) => item.effect.item)).filter(Boolean);
    expect(awards.every((id) => known.has(id!))).toBe(true);
  });
});

describe('complete game loop', () => {
  it('creates a named sixteen-year-old character', () => {
    const state = fresh();
    expect(state.character.name).toBe('宁玄');
    expect(state.character.age).toBe(16);
  });

  it('normalizes a blank name to 无名', () => {
    expect(createGame({ ...options, name: ' ' }, 1).character.name).toBe('无名');
  });

  it('gives body cultivators more health', () => {
    const body = createGame({ ...options, path: '体' }, 1);
    expect(body.character.maxHealth).toBeGreaterThan(fresh().character.maxHealth);
  });

  it('gives spell cultivators more qi', () => {
    const spell = createGame({ ...options, path: '法' }, 1);
    expect(spell.character.maxQi).toBeGreaterThan(fresh().character.maxQi);
  });

  it('gives clan heirs more spirit stones', () => {
    const clan = createGame({ ...options, origin: 'clan' }, 1);
    expect(clan.territory.spiritStones).toBeGreaterThan(fresh().territory.spiritStones);
  });

  it('gives fallen sect heirs early insight', () => {
    const fallen = createGame({ ...options, origin: 'fallen' }, 1);
    expect(fallen.daoPattern.insight).toBe(8);
  });

  it('calculates a positive total power', () => {
    expect(totalPower(fresh())).toBeGreaterThan(0);
  });

  it('performs insight meditation and creates an event', () => {
    const state = fresh();
    const result = performAction(state, '悟道');
    expect(result.ok).toBe(true);
    expect(result.state.daoPattern.insight).toBeGreaterThan(0);
    expect(result.state.pendingEvent).not.toBeNull();
  });

  it('does not mutate the prior state during an action', () => {
    const state = fresh();
    performAction(state, '悟道');
    expect(state.turn).toBe(0);
    expect(state.daoPattern.insight).toBe(0);
  });

  it('blocks a second action while an event awaits', () => {
    const waiting = performAction(fresh(), '悟道').state;
    expect(performAction(waiting, '悟道').ok).toBe(false);
  });

  it('resolves an event choice and records it as seen', () => {
    const waiting = performAction(fresh(), '悟道').state;
    const id = waiting.pendingEvent;
    const result = chooseEvent(waiting, 0);
    expect(result.ok).toBe(true);
    expect(result.state.pendingEvent).toBeNull();
    expect(result.state.seenEvents).toContain(id);
  });

  it('rejects an event choice when nothing is pending', () => {
    expect(chooseEvent(fresh(), 0).ok).toBe(false);
  });

  it('engraves a pattern after gathering enough insight', () => {
    const state = fresh();
    state.daoPattern.insight = 20;
    const result = performAction(state, '凝纹');
    expect(result.ok).toBe(true);
    expect(result.state.daoPattern.engraved).toBe(1);
  });

  it('blocks engraving before the insight threshold', () => {
    expect(actionAvailability(fresh(), '凝纹').available).toBe(false);
  });

  it('spends qi in combat', () => {
    const state = fresh();
    const result = performAction(state, '斗法');
    expect(result.state.character.qi).toBeLessThan(state.character.qi);
  });

  it('can claim the first territory through the action loop', () => {
    const result = performAction(fresh(7), '占地');
    expect(result.ok).toBe(true);
    expect(result.state.territory.nodes).toBe(1);
  });

  it('requires a pattern before breakthrough', () => {
    expect(actionAvailability(fresh(), '突破').reason).toContain('1 道纹');
  });

  it('can break through after meeting requirements', () => {
    const state = fresh(1);
    state.daoPattern.engraved = 1;
    const result = performAction(state, '突破');
    expect(result.ok).toBe(true);
    expect(result.state.character.realm).toBe(1);
  });

  it('advances age every fourth action', () => {
    let state = fresh();
    for (let index = 0; index < 4; index += 1) state = settle(performAction(state, '悟道').state);
    expect(state.character.age).toBe(17);
  });

  it('uses and consumes a healing pill', () => {
    const state = fresh();
    state.character.health = 50;
    const result = useItem(state, 'healing-pill');
    expect(result.state.character.health).toBe(74);
    expect(result.state.inventory).not.toContain('healing-pill');
  });

  it('rejects an item absent from the inventory', () => {
    expect(useItem(fresh(), 'heaven-key').ok).toBe(false);
  });

  it('returns ending details by key', () => {
    expect(getEnding('death')?.title).toBe('雷殒荒丘');
    expect(getEnding(null)).toBeNull();
  });

  it('detects death at zero health', () => {
    const state = fresh();
    state.character.health = 0;
    expect(evaluateEnding(state)).toBe('death');
  });

  it('detects old age at the lifespan limit', () => {
    const state = fresh();
    state.character.age = state.character.lifespan;
    expect(evaluateEnding(state)).toBe('oldAge');
  });

  it('detects the territorial conquest ending', () => {
    const state = fresh();
    state.character.realm = 3;
    state.territory.nodes = 8;
    expect(evaluateEnding(state)).toBe('conqueror');
  });

  it('detects a path-specific Dao Lord ending', () => {
    const state = fresh();
    state.character.realm = REALMS.length - 1;
    expect(evaluateEnding(state)).toBe('swordSupreme');
  });

  it('has a valid availability result for every action', () => {
    for (const action of ACTIONS as readonly CoreAction[]) {
      const result = actionAvailability(fresh(), action);
      expect(typeof result.available).toBe('boolean');
      expect(typeof result.reason).toBe('string');
    }
  });
});
