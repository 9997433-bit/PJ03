import { ENDINGS, EVENTS, ITEMS } from './content';
import {
  canEngrave,
  comprehend,
  createDaoPattern,
  engravePattern,
  patternPower,
  patternsForBreakthrough,
} from './daoPattern';
import { chance, normalizeSeed, rollInt } from './rng';
import {
  createSoul,
  restoreSoul,
  soulCombatPower,
  spendSoul,
  temperSoul,
} from './soulPower';
import {
  canClaim,
  claimDifficulty,
  claimTerritory,
  createTerritory,
  harvestTerritory,
  loseTerritory,
  territoryPower,
} from './territory';
import type {
  ActionResult,
  CoreAction,
  CreationOptions,
  Effect,
  EndingKey,
  GameState,
  LogEntry,
} from './types';
import { REALMS } from './types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const copy = (state: GameState): GameState => JSON.parse(JSON.stringify(state)) as GameState;

function log(state: GameState, text: string, tone: LogEntry['tone'] = 'normal'): void {
  state.logs = [...state.logs, { turn: state.turn, tone, text }].slice(-60);
}

export function createGame(options: CreationOptions, seed = Date.now()): GameState {
  const path = options.path;
  const bodyBonus = path === '体' ? 28 : path === '剑' ? 8 : 0;
  const qiBonus = path === '法' ? 26 : path === '神' ? 10 : 0;
  const territory = createTerritory();
  const daoPattern = createDaoPattern();
  const soul = createSoul(path);
  const inventory: string[] = ['healing-pill', 'soul-pill'];

  if (options.origin === 'mountain') {
    territory.food += 30;
  } else if (options.origin === 'clan') {
    territory.spiritStones += 55;
    inventory.push('qi-pill');
  } else if (options.origin === 'wanderer') {
    territory.influence += 8;
  } else {
    daoPattern.insight += 8;
    inventory.push('turtle-rubbing');
  }

  if (options.vow === 'guard') territory.control += 12;
  if (options.vow === 'freedom') soul.stability += 8;
  if (options.vow === 'supreme') daoPattern.insight += 4;

  return {
    version: 1,
    seed: normalizeSeed(seed),
    turn: 0,
    character: {
      name: options.name.trim() || '无名',
      origin: options.origin,
      path,
      vow: options.vow,
      age: 16,
      lifespan: 112,
      realm: 0,
      health: 100 + bodyBonus,
      maxHealth: 100 + bodyBonus,
      qi: 70 + qiBonus,
      maxQi: 70 + qiBonus,
      reputation: options.origin === 'wanderer' ? 8 : 0,
      karma: options.vow === 'mercy' ? 10 : 0,
    },
    daoPattern,
    soul,
    territory,
    inventory,
    seenEvents: [],
    pendingEvent: null,
    logs: [{ turn: 0, tone: 'thunder', text: `十六岁，${options.name.trim() || '无名'}在雷雨中感应到第一缕道纹。` }],
    ending: null,
  };
}

export function totalPower(state: GameState): number {
  const { character } = state;
  const pathBonus = character.path === '剑' ? 16 : character.path === '体' ? 14 : 0;
  return (
    20 +
    character.realm * 30 +
    patternPower(state.daoPattern) +
    soulCombatPower(state.soul, character.path) +
    territoryPower(state.territory) +
    pathBonus
  );
}

export function actionAvailability(state: GameState, action: CoreAction): { available: boolean; reason: string } {
  if (state.ending) return { available: false, reason: '此生已成定局' };
  if (state.pendingEvent) return { available: false, reason: '先作出当前抉择' };
  // 悟道 is always available: with a drained soul it degrades to a pure rest
  // turn, guaranteeing the resource-regeneration path can never soft-lock.
  if (action === '凝纹') {
    if (!canEngrave(state.daoPattern)) {
      const need = 12 + state.daoPattern.engraved * 4;
      return { available: false, reason: `需 ${need} 感悟与 20 调和` };
    }
    if (state.soul.power < 8) return { available: false, reason: '神魂至少需要 8 点' };
  }
  if (action === '斗法' && state.character.qi < 8) return { available: false, reason: '灵气至少需要 8 点' };
  if (action === '占地') {
    if (!canClaim(state.territory)) return { available: false, reason: '需要 10 粮草与 10 掌控' };
    if (state.character.qi < 10) return { available: false, reason: '灵气至少需要 10 点' };
  }
  if (action === '突破') {
    if (state.character.realm >= REALMS.length - 1) return { available: false, reason: '已立于大道绝巅' };
    if (state.daoPattern.engraved < patternsForBreakthrough(state.character.realm)) {
      return { available: false, reason: `需 ${patternsForBreakthrough(state.character.realm)} 道纹` };
    }
    const soulNeed = 28 + state.character.realm * 8;
    if (state.soul.power < soulNeed) return { available: false, reason: `需 ${soulNeed} 神魂` };
    if (state.territory.nodes < Math.floor(state.character.realm / 2)) {
      return { available: false, reason: '领地不足以承载天劫' };
    }
  }
  return { available: true, reason: '' };
}

function applyEffectMutable(state: GameState, effect: Effect): void {
  const c = state.character;
  const d = state.daoPattern;
  const s = state.soul;
  const t = state.territory;

  if (effect.maxSoul) {
    s.maxPower = Math.max(1, s.maxPower + effect.maxSoul);
    s.power = clamp(s.power + Math.max(0, effect.maxSoul), 0, s.maxPower);
  }
  c.health = clamp(c.health + (effect.health ?? 0), 0, c.maxHealth);
  c.qi = clamp(c.qi + (effect.qi ?? 0), 0, c.maxQi);
  c.reputation += effect.reputation ?? 0;
  c.karma += effect.karma ?? 0;
  d.insight = Math.max(0, d.insight + (effect.insight ?? 0));
  d.engraved = Math.max(0, d.engraved + (effect.engraved ?? 0));
  d.harmony = clamp(d.harmony + (effect.harmony ?? 0), 0, 100);
  s.power = clamp(s.power + (effect.soul ?? 0), 0, s.maxPower);
  s.stability = clamp(s.stability + (effect.stability ?? 0), 0, 100);
  t.nodes = Math.max(0, t.nodes + (effect.nodes ?? 0));
  t.control = clamp(t.control + (effect.control ?? 0), 0, 100);
  t.food = clamp(t.food + (effect.food ?? 0), 0, 999);
  t.spiritStones = clamp(t.spiritStones + (effect.spiritStones ?? 0), 0, 9999);
  t.influence = Math.max(0, t.influence + (effect.influence ?? 0));
  if (effect.item && ITEMS.some((item) => item.id === effect.item)) state.inventory.push(effect.item);
}

function selectEvent(state: GameState, action: CoreAction): void {
  const eligible = EVENTS.filter(
    (item) =>
      item.actions.includes(action) &&
      (!item.paths || item.paths.includes(state.character.path)) &&
      (item.minRealm === undefined || state.character.realm >= item.minRealm),
  );
  const unseen = eligible.filter((item) => !state.seenEvents.includes(item.id));
  const pool = unseen.length ? unseen : eligible;
  if (!pool.length) return;
  const roll = rollInt(state.seed, 0, pool.length - 1);
  state.seed = roll.seed;
  state.pendingEvent = pool[roll.value]!.id;
}

function advanceTurn(state: GameState): void {
  state.turn += 1;
  if (state.turn % 4 === 0) state.character.age += 1;
  state.territory = harvestTerritory(state.territory);
  state.soul = restoreSoul(state.soul, 3 + Math.floor(state.territory.nodes / 2));
  state.character.qi = Math.min(state.character.maxQi, state.character.qi + 5);
  state.territory.food = Math.max(0, state.territory.food - Math.max(1, state.territory.nodes));
  if (state.territory.food === 0 && state.territory.nodes > 0) {
    state.territory.control = Math.max(0, state.territory.control - 4);
    log(state, '粮仓见底，领地人心开始动摇。', 'danger');
  }
}

export function evaluateEnding(state: GameState): EndingKey | null {
  if (state.character.health <= 0 || state.soul.stability <= 0) return 'death';
  if (state.character.age >= state.character.lifespan) return 'oldAge';
  // Rank-天 victory endings outrank every milestone ending on the same turn.
  if (state.character.realm >= REALMS.length - 1) {
    const pathEndings: Record<GameState['character']['path'], EndingKey> = {
      剑: 'swordSupreme',
      法: 'spellSupreme',
      体: 'bodySupreme',
      神: 'soulSupreme',
    };
    return pathEndings[state.character.path];
  }
  if (state.territory.nodes >= 8 && state.character.realm >= 3) return 'conqueror';
  if (state.daoPattern.engraved >= 12) return 'patternSage';
  if (state.soul.maxPower >= 180 && state.character.realm >= 3) return 'soulAscendant';
  if (state.territory.spiritStones >= 1200) return 'magnate';
  if (state.character.karma >= 100 && state.character.reputation >= 80) return 'benevolent';
  if (state.character.vow === 'freedom' && state.character.age >= 90 && state.territory.nodes <= 2) return 'wanderer';
  return null;
}

function finishIfNeeded(state: GameState): void {
  const ending = evaluateEnding(state);
  if (!ending) return;
  state.ending = ending;
  state.pendingEvent = null;
  const detail = ENDINGS.find((item) => item.id === ending);
  log(state, `命数已定：${detail?.title ?? ending}`, ending === 'death' ? 'danger' : 'thunder');
}

export function performAction(current: GameState, action: CoreAction): ActionResult {
  const check = actionAvailability(current, action);
  if (!check.available) return { ok: false, message: check.reason, state: current };
  const state = copy(current);
  const c = state.character;
  let message = '';

  if (action === '悟道') {
    if (state.soul.power < 6) {
      message = '神魂枯竭，此番静坐只得喘息，未见天地之纹。';
      log(state, message, 'normal');
    } else {
      const roll = rollInt(state.seed, 6, 13);
      state.seed = roll.seed;
      const pathBonus = c.path === '法' || c.path === '神' ? 2 : 0;
      state.soul = spendSoul(state.soul, 6);
      state.daoPattern = comprehend(state.daoPattern, roll.value + pathBonus);
      message = `静观天地，得 ${roll.value + pathBonus} 点道纹感悟。`;
      log(state, message, 'good');
    }
  } else if (action === '凝纹') {
    const before = state.daoPattern.engraved;
    state.soul = spendSoul(state.soul, 8);
    state.daoPattern = engravePattern(state.daoPattern, c.path);
    const patternName = state.daoPattern.namedPatterns.at(-1) ?? `第 ${before + 1} 道纹`;
    c.maxQi += c.path === '法' ? 6 : 3;
    c.qi = Math.min(c.maxQi, c.qi + 8);
    message = `${patternName}凝成，纹威流转周身。`;
    log(state, message, 'thunder');
  } else if (action === '斗法') {
    c.qi -= 8;
    const foe = rollInt(state.seed, 35 + c.realm * 28, 72 + c.realm * 34);
    state.seed = foe.seed;
    const strike = rollInt(state.seed, 0, 38);
    state.seed = strike.seed;
    const margin = totalPower(state) + strike.value - foe.value;
    if (margin >= 0) {
      const loot = 10 + Math.floor(margin / 8);
      state.territory.spiritStones += loot;
      c.reputation += 3;
      message = `斗法得胜，夺得 ${loot} 灵石。`;
      log(state, message, 'good');
    } else {
      const wound = Math.min(28, 7 + Math.ceil(Math.abs(margin) / 7));
      c.health = Math.max(0, c.health - wound);
      state.soul.stability = Math.max(0, state.soul.stability - 3);
      message = `斗法失利，受创 ${wound} 点。`;
      log(state, message, 'danger');
    }
  } else if (action === '占地') {
    c.qi -= 10;
    const contest = rollInt(state.seed, 0, 55);
    state.seed = contest.seed;
    const margin = totalPower(state) + contest.value - claimDifficulty(state.territory.nodes);
    if (margin >= 0) {
      state.territory = claimTerritory(state.territory, margin);
      message = `破阵立碑，疆域扩至 ${state.territory.nodes} 处灵地。`;
      log(state, message, 'thunder');
    } else {
      state.territory = loseTerritory(state.territory, 8);
      c.health = Math.max(0, c.health - 5);
      message = '开疆受阻，边境掌控动摇。';
      log(state, message, 'danger');
    }
  } else {
    const soulCost = 15 + c.realm * 5;
    state.soul = spendSoul(state.soul, soulCost);
    const roll = chance(state.seed, Math.min(0.9, 0.55 + state.daoPattern.harmony / 500 + state.soul.stability / 600));
    state.seed = roll.seed;
    if (roll.value === 1) {
      c.realm += 1;
      c.maxHealth += 14 + (c.path === '体' ? 10 : 0);
      c.health = c.maxHealth;
      c.maxQi += 15 + (c.path === '法' ? 8 : 0);
      c.qi = c.maxQi;
      state.soul = temperSoul(state.soul, 10 + (c.path === '神' ? 7 : 0));
      state.daoPattern.harmony = Math.min(100, state.daoPattern.harmony + 10);
      c.lifespan += 24 + c.realm * 8;
      message = `雷劫散尽，踏入${REALMS[c.realm]}境！`;
      log(state, message, 'thunder');
    } else {
      const wound = 14 + c.realm * 5;
      c.health = Math.max(1, c.health - wound);
      state.daoPattern.harmony = Math.max(0, state.daoPattern.harmony - 10);
      message = `天门未开，雷劫反噬 ${wound} 点。`;
      log(state, message, 'danger');
    }
  }

  advanceTurn(state);
  finishIfNeeded(state);
  if (!state.ending) selectEvent(state, action);
  return { ok: true, message, state };
}

export function chooseEvent(current: GameState, choiceIndex: 0 | 1): ActionResult {
  if (!current.pendingEvent) return { ok: false, message: '当前没有待决事件', state: current };
  const event = EVENTS.find((item) => item.id === current.pendingEvent);
  if (!event) return { ok: false, message: '事件已消散', state: { ...current, pendingEvent: null } };
  const selected = event.choices[choiceIndex];
  const state = copy(current);
  applyEffectMutable(state, selected.effect);
  state.seenEvents = [...state.seenEvents, event.id].slice(-24);
  state.pendingEvent = null;
  log(state, `${event.title}：${selected.result}`, choiceIndex === 0 ? 'normal' : 'good');
  finishIfNeeded(state);
  return { ok: true, message: selected.result, state };
}

export function useItem(current: GameState, itemId: string): ActionResult {
  const index = current.inventory.indexOf(itemId);
  const item = ITEMS.find((candidate) => candidate.id === itemId);
  if (index < 0 || !item) return { ok: false, message: '行囊中没有此物', state: current };
  if (current.ending) return { ok: false, message: '命数已定', state: current };
  const state = copy(current);
  applyEffectMutable(state, item.effect);
  if (item.consumable) state.inventory.splice(index, 1);
  log(state, `使用${item.name}：${item.description}`, 'good');
  finishIfNeeded(state);
  return { ok: true, message: `已使用${item.name}`, state };
}

export function getEnding(key: EndingKey | null) {
  return ENDINGS.find((ending) => ending.id === key) ?? null;
}
