/**
 * ============================================================================
 * STUB ENGINE — placeholder game logic so the UI is buildable & demoable.
 *
 * The real engine (creation.ts / cultivation.ts / breakthrough.ts / combat.ts /
 * events.ts / economy.ts / alchemy.ts / turn.ts / audit.ts per PLAN.md) will
 * replace this module; the store (`src/store/gameStore.ts`) is the only
 * consumer, so swapping it out is contained to one import site.
 *
 * Rules honored even in the stub:
 *  - every random number flows through engine/rng.ts and lands in the audit trail
 *  - 机缘 (jiYuan) is never written into any narrative/log/UI string
 *  - only these functions produce new GameState objects (single-writer)
 * ============================================================================
 */
import { getOrigin, ORIGINS } from "@/data/origins";
import { bandForRoll, ELEMENTS, MUTANT_ELEMENTS } from "@/data/spiritRoots";
import { lifespanFor, nextRealm, realmLabel, REALM_BY_ID, STAGES } from "@/data/realmData";
import { getTechnique } from "@/data/techniques";
import { getItem } from "@/data/items";
import { getRecipe } from "@/data/recipes";
import { INITIAL_NPCS } from "@/data/npcs";
import { createSeed, makeAuditedRoll, seedToState } from "./rng";
import type { Die } from "./types";
import type {
  Attributes,
  Character,
  CombatState,
  Element,
  Enemy,
  GameState,
  LogEntry,
  PendingEvent,
  Quest,
  RealmId,
  SpiritRoot,
} from "./types";

// ===== audit hash (cyrb53, synchronous stand-in for sha256 chain) =====
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0")
  );
}

const LOG_CAP = 300;
const ROLL_CAP = 600;

function pushLog(s: GameState, entry: Omit<LogEntry, "turn"> & { turn?: number }): void {
  s.narrativeLog.push({ turn: entry.turn ?? s.turn, speaker: entry.speaker, text: entry.text, tone: entry.tone });
  if (s.narrativeLog.length > LOG_CAP) s.narrativeLog.splice(0, s.narrativeLog.length - LOG_CAP);
}

/** Audited dice roll bound to game state. */
function doRoll(s: GameState, die: Die, reason: string): number {
  const id = (s.rolls.at(-1)?.id ?? 0) + 1;
  const { value, nextState, roll } = makeAuditedRoll(s.rngState, die, reason, id, s.turn);
  s.rngState = nextState;
  s.rolls.push(roll);
  if (s.rolls.length > ROLL_CAP) s.rolls.splice(0, s.rolls.length - ROLL_CAP);
  s.rollSeq = (s.rollSeq ?? 1) + 1;
  s.auditHash = cyrb53(`${s.auditHash}|${s.turn}|${reason}|${value}`);
  return value;
}

function clone(s: GameState): GameState {
  return structuredClone(s);
}

// ===== state factories =====
export function titleState(): GameState {
  return {
    version: 1,
    seed: "",
    rngState: "",
    phase: "title",
    creationStep: 0,
    turn: 0,
    character: null,
    npcs: {},
    quests: [],
    combat: null,
    narrativeLog: [],
    rolls: [],
    auditHash: cyrb53("genesis"),
    ending: null,
    rollSeq: 1,
    killCount: 0,
  };
}

export function beginCreation(): GameState {
  const s = titleState();
  const seed = createSeed();
  s.seed = seed;
  s.rngState = seedToState(seed);
  s.phase = "creation";
  s.creationStep = 0;
  pushLog(s, {
    speaker: "天道",
    text: "混沌初开,一缕神识坠入凡尘。汝之命格,自此而始。",
  });
  return s;
}

// ===== creation =====
const BASE_ATTR = 5;
export const FREE_POINTS = 10;
export const ATTR_CAP = 10;

export function creationChooseOrigin(
  state: GameState,
  originId: string,
  name: string,
  gender: "男" | "女",
): GameState {
  const s = clone(state);
  const origin = getOrigin(originId);
  if (!origin || s.creationStep !== 0) return s;
  const attributes: Attributes = {
    genGu: BASE_ATTR + (origin.attributeMods.genGu ?? 0),
    wuXing: BASE_ATTR + (origin.attributeMods.wuXing ?? 0),
    xinXing: BASE_ATTR + (origin.attributeMods.xinXing ?? 0),
    jiYuan: 0,
    qiYun: BASE_ATTR + (origin.attributeMods.qiYun ?? 0),
  };
  s.character = {
    name: name.trim() || "无名",
    gender,
    originId,
    attributes,
    spiritRoot: { grade: "五灵根", elements: [], speedMultiplier: 0, rollValue: 0 },
    realm: { realm: "mortal", qiLayer: 0, stage: "初期", exp: 0, expNeeded: REALM_BY_ID.mortal.baseExpPerLevel[0] ?? 100 },
    age: 16,
    lifespan: lifespanFor("mortal"),
    hp: 0,
    maxHp: 0,
    injuries: [],
    techniqueId: origin.startFlags?.clanTeaching ? "yinqijue" : null,
    combatArts: [],
    spiritStones: origin.startSpiritStones,
    inventory: [],
    equipped: {},
    sectId: null,
    flags: { ...(origin.startFlags ?? {}) },
  };
  for (const itemId of origin.startItems) {
    addItem(s.character, itemId, 1);
  }
  const ch = s.character;
  s.creationStep = 1;
  pushLog(s, { speaker: "天道", text: `${origin.name}${gender === "男" ? "之子" : "之女"},名唤「${ch.name}」。${origin.desc}` });
  return s;
}

export function creationAllocate(
  state: GameState,
  alloc: { genGu: number; wuXing: number; xinXing: number; qiYun: number },
): GameState {
  const s = clone(state);
  if (!s.character || s.creationStep !== 1) return s;
  const origin = getOrigin(s.character.originId);
  const base = {
    genGu: BASE_ATTR + (origin?.attributeMods.genGu ?? 0),
    wuXing: BASE_ATTR + (origin?.attributeMods.wuXing ?? 0),
    xinXing: BASE_ATTR + (origin?.attributeMods.xinXing ?? 0),
    qiYun: BASE_ATTR + (origin?.attributeMods.qiYun ?? 0),
  };
  const spent =
    alloc.genGu - base.genGu + alloc.wuXing - base.wuXing + alloc.xinXing - base.xinXing + alloc.qiYun - base.qiYun;
  const withinCap = [alloc.genGu, alloc.wuXing, alloc.xinXing, alloc.qiYun].every(
    (v) => v >= BASE_ATTR - 2 && v <= ATTR_CAP,
  );
  if (spent !== FREE_POINTS || !withinCap) return s;
  s.character.attributes.genGu = alloc.genGu;
  s.character.attributes.wuXing = alloc.wuXing;
  s.character.attributes.xinXing = alloc.xinXing;
  s.character.attributes.qiYun = alloc.qiYun;
  s.character.maxHp = maxHpOf(s.character);
  s.character.hp = s.character.maxHp;
  s.creationStep = 2;
  pushLog(s, { speaker: "天道", text: "骨相已定,禀赋各安其位。天不增减一分。" });
  return s;
}

export function creationRollSpiritRoot(state: GameState): GameState {
  const s = clone(state);
  if (!s.character || s.creationStep !== 2) return s;
  const v = doRoll(s, "D100", "灵根抽取");
  const band = bandForRoll(v);
  let elements: Element[];
  if (band.elementCount >= 5) {
    elements = [...ELEMENTS];
  } else {
    const pool = [...ELEMENTS];
    elements = [];
    for (let i = 0; i < band.elementCount; i++) {
      const idx = (doRoll(s, "D6", "灵根属性") - 1) % pool.length;
      const picked = pool.splice(idx, 1)[0];
      if (picked) elements.push(picked);
    }
  }
  const root: SpiritRoot = {
    grade: band.grade,
    elements,
    speedMultiplier: band.speedMultiplier,
    rollValue: v,
  };
  s.character.spiritRoot = root;
  s.creationStep = 3;
  const mutant = band.grade === "异灵根" ? MUTANT_ELEMENTS[v % MUTANT_ELEMENTS.length] : null;
  const elemText = mutant ? `变异·${mutant}` : elements.join("");
  const tone = band.speedMultiplier >= 1.6 ? "gold" : band.speedMultiplier <= 0.5 ? "danger" : "normal";
  pushLog(s, {
    speaker: "天道",
    tone,
    text: `测灵碑微光一闪——${band.grade}(${elemText})。${band.note}。天命如此,不容置喙。`,
  });
  return s;
}

export function creationHiddenRoll(state: GameState): GameState {
  const s = clone(state);
  if (!s.character || s.creationStep !== 3) return s;
  const v = doRoll(s, "D100", "暗掷·命数");
  s.character.attributes.jiYuan = Math.max(1, Math.min(10, Math.ceil(v / 10)));
  s.creationStep = 4;
  pushLog(s, { speaker: "天道", text: "天道已掷,命数已定。此签深埋因果,汝永不得见。" });
  return s;
}

export function creationEnterWorld(state: GameState): GameState {
  const s = clone(state);
  if (!s.character || s.creationStep !== 4) return s;
  s.phase = "playing";
  s.turn = 1;
  s.quests = initialQuests();
  s.npcs = JSON.parse(JSON.stringify(INITIAL_NPCS)) as GameState['npcs'];
  pushLog(s, {
    speaker: "天道",
    text: `${s.character.name},年十六,踏出乡关。青山遮目,大道无声。自此一饮一啄,皆有定数。`,
  });
  pushLog(s, {
    speaker: "系统",
    tone: "jade",
    text: "指令:修炼 / 突破 / 探索 / 坊市 / 炼丹 / 背包 / 任务 / 面板 / 审计。亦可直接输入。",
  });
  return s;
}

function initialQuests(): Quest[] {
  return [
    {
      id: "main_ch1",
      kind: "main",
      chapter: 1,
      title: "第一章·问道之始",
      narrative:
        "山外有山。青云宗每十年一开山门;城中亦有散修市井;族中长辈捎来书信,言家族正值用人之际。何去何从?",
      choices: [
        { text: "投青云宗,拜入山门", effect: { narrative: "宗门月例虽薄,道途有靠。", spiritStones: 20, flag: ["sect", 1] } },
        { text: "为散修,自在逍遥", effect: { narrative: "无拘无束,亦无依无靠。", exp: 30, flag: ["sect", 0] } },
        { text: "投效家族,以血脉为凭", effect: { narrative: "家族予你灵石,亦予你枷锁。", spiritStones: 60, flag: ["sect", 2] } },
      ],
      reward: { narrative: "" },
      status: "active",
    },
    {
      id: "side_zhuji",
      kind: "side",
      title: "求丹·筑基之阶",
      narrative: "坊间传言:欲越筑基天堑,一枚筑基丹可增两成胜算。或购于坊市,或亲手炼之。",
      objective: { type: "obtainItem", target: "zhujidan", n: 1 },
      reward: { narrative: "手握筑基丹,天堑亦可为途。" },
      status: "active",
    },
    {
      id: "main_ch2",
      kind: "main",
      chapter: 2,
      title: "第二章·筑基机缘之争",
      narrative: "筑基之路,从无坦途。(踏入炼气后期后开启)",
      reward: { narrative: "" },
      status: "locked",
    },
  ];
}

// ===== derived stats =====
export function maxHpOf(c: Character): number {
  const realmIdx = ["mortal", "qi", "foundation", "core", "nascent", "deity"].indexOf(c.realm.realm);
  return 40 + c.attributes.genGu * 8 + realmIdx * 30 + (c.realm.realm === "qi" ? c.realm.qiLayer * 4 : 0);
}

export function powerOf(c: Character): number {
  const def = REALM_BY_ID[c.realm.realm];
  const stageMult = c.realm.realm === "qi" ? 1 + c.realm.qiLayer * 0.12 : 1 + STAGES.indexOf(c.realm.stage) * 0.35;
  const weapon = c.equipped.weapon ? (getItem(c.equipped.weapon)?.power ?? 0) : 0;
  const tech = c.techniqueId ? getTechnique(c.techniqueId)?.powerBonus ?? 0 : 0;
  let p = def.powerBase * stageMult + c.attributes.genGu * 3 + weapon + tech;
  if (c.flags.killer) p *= 1.05;
  return Math.round(p);
}

export function defenseOf(c: Character): number {
  return c.equipped.armor ? (getItem(c.equipped.armor)?.defense ?? 0) : 0;
}

function injurySpeedPenalty(c: Character): number {
  return c.injuries.reduce((m, i) => m * (1 - (i.effect.speed ?? 0)), 1);
}

export function cultivationGain(c: Character): number {
  const tech = c.techniqueId ? getTechnique(c.techniqueId) : undefined;
  let techBonus = tech?.speedBonus ?? 1;
  if (tech?.elementAffinity && tech.elementAffinity.some((e) => c.spiritRoot.elements.includes(e))) {
    techBonus *= 1.2;
  }
  const base = 30;
  return Math.max(
    1,
    Math.round(base * c.spiritRoot.speedMultiplier * (1 + c.attributes.wuXing * 0.05) * techBonus * injurySpeedPenalty(c)),
  );
}

export function breakthroughChance(c: Character): number {
  const def = REALM_BY_ID[c.realm.realm];
  let chance = def.breakthroughBaseChance + c.attributes.genGu * 2 + c.attributes.xinXing * 1;
  chance += (c.flags.breakthroughBonus as number | undefined) ?? 0;
  for (const inj of c.injuries) chance -= (inj.effect.breakthrough ?? 0) * 100;
  if (c.flags.bottleneck) chance = Math.floor(chance / 2);
  return Math.max(1, Math.min(95, Math.round(chance)));
}

// ===== inventory helpers =====
function addItem(c: Character, itemId: string, count: number): void {
  const stack = c.inventory.find((x) => x.itemId === itemId);
  if (stack) stack.count += count;
  else c.inventory.push({ itemId, count });
}

function removeItem(c: Character, itemId: string, count: number): boolean {
  const stack = c.inventory.find((x) => x.itemId === itemId);
  if (!stack || stack.count < count) return false;
  stack.count -= count;
  if (stack.count <= 0) c.inventory = c.inventory.filter((x) => x.count > 0);
  return true;
}

function countItem(c: Character, itemId: string): number {
  return c.inventory.find((x) => x.itemId === itemId)?.count ?? 0;
}

// ===== lifecycle =====
function checkQuests(s: GameState): void {
  const c = s.character;
  if (!c) return;
  for (const q of s.quests) {
    if (q.status !== "active" || !q.objective) continue;
    if (q.objective.type === "obtainItem" && q.objective.target && countItem(c, q.objective.target) >= (q.objective.n ?? 1)) {
      q.status = "done";
      pushLog(s, { speaker: "系统", tone: "jade", text: `任务达成——「${q.title}」。${q.reward.narrative}` });
    }
    if (q.objective.type === "reachRealm" && c.realm.realm === q.objective.target) {
      q.status = "done";
      pushLog(s, { speaker: "系统", tone: "jade", text: `任务达成——「${q.title}」。${q.reward.narrative}` });
    }
  }
  const ch2 = s.quests.find((q) => q.id === "main_ch2");
  if (ch2 && ch2.status === "locked" && c.realm.realm === "qi" && c.realm.qiLayer >= 9) {
    ch2.status = "active";
    pushLog(s, { speaker: "系统", tone: "gold", text: "主线开启——「第二章·筑基机缘之争」。" });
  }
}

function endRun(s: GameState, id: string, title: string, summary: string): void {
  s.phase = "ended";
  s.combat = null;
  s.ending = { id, title, summary };
}

function lifecycleCheck(s: GameState): void {
  const c = s.character;
  if (!c || s.phase === "ended") return;
  if (c.hp <= 0) {
    pushLog(s, { speaker: "天道", tone: "danger", text: "灯枯油尽,神魂俱灭。尘归尘,土归土。" });
    endRun(s, "death", "身死道消", `${c.name}陨落于${realmLabel(c.realm)},享年${c.age}。`);
    return;
  }
  if (c.age >= c.lifespan) {
    pushLog(s, { speaker: "天道", tone: "danger", text: "寿数至矣。汝之一生,不过天地一瞬。" });
    endRun(s, "oldage", "寿元耗尽", `${c.name}坐化于${realmLabel(c.realm)},享年${c.age}。未能问鼎大道。`);
  }
}

function advanceTime(s: GameState): void {
  const c = s.character;
  if (!c) return;
  s.turn += 1;
  if (s.turn % 4 === 0) c.age += 1;
  c.injuries = c.injuries
    .map((i) => ({ ...i, turnsLeft: i.turnsLeft - (c.flags.endureHardship ? 2 : 1) }))
    .filter((i) => i.turnsLeft > 0);
}

// ===== per-turn event =====
interface StubEvent {
  id: string;
  bucket: "大凶" | "小凶" | "平" | "小吉" | "大吉";
  run: (s: GameState) => PendingEvent | null;
}

const EVENTS: StubEvent[] = [
  {
    id: "beast_attack",
    bucket: "大凶",
    run: (s) => {
      pushLog(s, { speaker: "天道", tone: "danger", text: "腥风忽起,草木伏地——有妖兽循汝气息而来。" });
      startCombatInner(s, pickEnemy(s));
      return null;
    },
  },
  {
    id: "qi_deviation",
    bucket: "大凶",
    run: (s) => {
      const c = s.character!;
      const dmg = Math.round(c.maxHp * 0.2);
      c.hp = Math.max(1, c.hp - dmg);
      c.injuries.push({ id: `inj_${s.turn}`, name: "心魔暗伤", severity: 2, turnsLeft: 6, effect: { speed: 0.3, breakthrough: 0.1 } });
      pushLog(s, { speaker: "天道", tone: "danger", text: `行功岔气,真元逆走。汝呕血不止,落下心魔暗伤。(气血 −${dmg})` });
      return null;
    },
  },
  {
    id: "lose_stones",
    bucket: "小凶",
    run: (s) => {
      const c = s.character!;
      const lost = Math.min(c.spiritStones, 5 + s.turn % 7);
      c.spiritStones -= lost;
      pushLog(s, { speaker: "天道", text: lost > 0 ? `行囊破了个口子。灵石散落无踪。(灵石 −${lost})` : "宵小窥视汝之行囊,然囊中空空,悻悻而去。" });
      return null;
    },
  },
  {
    id: "old_wound",
    bucket: "小凶",
    run: (s) => {
      const c = s.character!;
      const dmg = Math.round(c.maxHp * 0.08);
      c.hp = Math.max(1, c.hp - dmg);
      pushLog(s, { speaker: "天道", text: `阴雨连绵,旧伤隐隐作痛。(气血 −${dmg})` });
      return null;
    },
  },
  {
    id: "quiet_days",
    bucket: "平",
    run: (s) => {
      const lines = [
        "山中无甲子,寒尽不知年。",
        "汝观云起云落,心无波澜。",
        "一盏孤灯,一卷残经,岁月无声。",
        "溪水东流,不舍昼夜。汝之道心,亦当如是。",
      ];
      pushLog(s, { speaker: "天道", text: lines[s.turn % lines.length] ?? lines[0]! });
      return null;
    },
  },
  {
    id: "wandering_merchant",
    bucket: "平",
    run: (s) => {
      pushLog(s, { speaker: "天道", text: "偶遇行商,寒暄数句。其货皆凡品,不值一顾。" });
      return null;
    },
  },
  {
    id: "find_herb",
    bucket: "小吉",
    run: (s) => {
      addItem(s.character!, "lingcao", 2);
      pushLog(s, { speaker: "天道", tone: "jade", text: "崖畔石缝,两株灵草迎风而立。汝俯身取之。(灵草 ×2)" });
      return null;
    },
  },
  {
    id: "senior_advice",
    bucket: "小吉",
    run: (s) => {
      const c = s.character!;
      const gain = 20 + c.attributes.wuXing * 4;
      c.realm.exp += gain;
      pushLog(s, { speaker: "天道", tone: "jade", text: `茶肆之中,一老者随口点拨数语,竟暗合大道。(修为 +${gain})` });
      return null;
    },
  },
  {
    id: "epiphany",
    bucket: "大吉",
    run: (s) => {
      const c = s.character!;
      const v = doRoll(s, "D20", "顿悟·悟性检定");
      if (v + c.attributes.wuXing >= 18) {
        const gain = 80 + c.attributes.wuXing * 10;
        c.realm.exp += gain;
        pushLog(s, { speaker: "天道", tone: "gold", text: `电光石火之间,汝窥见一线天机。道行大进。(检定 D20=${v},修为 +${gain})` });
      } else {
        pushLog(s, { speaker: "天道", text: `冥冥中似有所悟,伸手欲抓,已然散去。(检定 D20=${v},差之毫厘)` });
      }
      return null;
    },
  },
  {
    id: "cave_treasure",
    bucket: "大吉",
    run: (s) => ({
      eventId: "cave_treasure",
      narrative: "荒山之腰,一处塌陷的洞府半掩于藤蔓之后。石门上禁制明灭不定,似有前人遗藏,亦似有未散的杀机。",
      choices: [
        { text: "入内探查", check: { attr: "qiYun", dc: 13 }, hint: "气运检定 DC13" },
        { text: "转身离去", hint: "谨慎为上" },
      ],
    }),
  },
  {
    id: "gifted_pill",
    bucket: "大吉",
    run: (s) => {
      addItem(s.character!, "juqidan", 1);
      pushLog(s, { speaker: "天道", tone: "gold", text: "一蓑衣人擦肩而过,袖中落下一枚丹药,回首已不见其踪。(聚气丹 ×1)" });
      return null;
    },
  },
];

function bucketOf(v: number): StubEvent["bucket"] {
  if (v <= 10) return "大凶";
  if (v <= 30) return "小凶";
  if (v <= 70) return "平";
  if (v <= 90) return "小吉";
  return "大吉";
}

function rollTurnEvent(s: GameState): PendingEvent | null {
  const c = s.character;
  if (!c || s.phase !== "playing") return null;
  const raw = doRoll(s, "D100", "遭遇事件");
  const shifted = Math.max(1, Math.min(100, raw + (c.attributes.qiYun - 5) * 2));
  const bucket = bucketOf(shifted);
  const pool = EVENTS.filter((e) => e.bucket === bucket);
  if (pool.length === 0) return null;
  const pick = pool[(raw + s.turn) % pool.length];
  if (!pick) return null;
  return pick.run(s);
}

export function resolveEventChoice(state: GameState, eventId: string, choiceIdx: number): GameState {
  const s = clone(state);
  const c = s.character;
  if (!c) return s;
  if (eventId === "cave_treasure") {
    if (choiceIdx === 0) {
      const v = doRoll(s, "D20", "洞府探查·气运检定");
      if (v + c.attributes.qiYun >= 13) {
        const stones = 40 + v * 3;
        c.spiritStones += stones;
        addItem(c, "zhujidan", 1);
        pushLog(s, { speaker: "天道", tone: "gold", text: `禁制早已朽坏。石案之上,灵石成堆,玉盒中静卧一枚丹药。(D20=${v},灵石 +${stones},筑基丹 ×1)` });
      } else {
        const dmg = Math.round(c.maxHp * 0.25);
        c.hp = Math.max(1, c.hp - dmg);
        pushLog(s, { speaker: "天道", tone: "danger", text: `残存的禁制轰然反噬。汝仓皇遁出,险些葬身其中。(D20=${v},气血 −${dmg})` });
      }
    } else {
      pushLog(s, { speaker: "天道", text: "汝驻足片刻,终是转身离去。福祸相依,未必是错。" });
    }
  }
  checkQuests(s);
  lifecycleCheck(s);
  return s;
}

// ===== combat =====
const ENEMIES: Enemy[] = [
  {
    id: "wild_wolf",
    name: "青目妖狼",
    realm: { realm: "mortal", qiLayer: 0, stage: "初期", exp: 0, expNeeded: 0 },
    power: 14,
    hp: 60,
    loot: [{ itemId: "yaodan", chance: 40 }],
    spiritStones: [2, 10],
    fleeable: true,
  },
  {
    id: "fox_demon",
    name: "赤瞳妖狐",
    realm: { realm: "qi", qiLayer: 5, stage: "初期", exp: 0, expNeeded: 0 },
    power: 34,
    hp: 130,
    loot: [
      { itemId: "yaodan", chance: 70 },
      { itemId: "lingcao", chance: 50 },
    ],
    spiritStones: [10, 40],
    fleeable: true,
  },
  {
    id: "rogue_cultivator",
    name: "黑风寨散修",
    realm: { realm: "qi", qiLayer: 9, stage: "初期", exp: 0, expNeeded: 0 },
    power: 55,
    hp: 190,
    loot: [
      { itemId: "huodanfu", chance: 40 },
      { itemId: "qingfengjian", chance: 15 },
    ],
    spiritStones: [30, 90],
    fleeable: true,
  },
  {
    id: "iron_bear",
    name: "铁背妖熊",
    realm: { realm: "foundation", qiLayer: 0, stage: "初期", exp: 0, expNeeded: 0 },
    power: 110,
    hp: 420,
    loot: [{ itemId: "yaodan", chance: 90 }],
    spiritStones: [80, 200],
    fleeable: false,
  },
];

export function getEnemy(id: string): Enemy | undefined {
  return ENEMIES.find((e) => e.id === id);
}

function pickEnemy(s: GameState): Enemy {
  const c = s.character!;
  const pool =
    c.realm.realm === "mortal"
      ? [ENEMIES[0]]
      : c.realm.realm === "qi" && c.realm.qiLayer <= 6
        ? [ENEMIES[0], ENEMIES[1]]
        : c.realm.realm === "qi"
          ? [ENEMIES[1], ENEMIES[2]]
          : [ENEMIES[2], ENEMIES[3]];
  return pool[(s.turn + s.rolls.length) % pool.length]!;
}

function startCombatInner(s: GameState, enemy: Enemy): void {
  const c = s.character!;
  s.phase = "combat";
  s.combat = {
    enemyId: enemy.id,
    enemyHp: enemy.hp,
    playerHp: c.hp,
    round: 1,
    log: [`「${enemy.name}」拦住去路,杀气毕露。`],
    over: false,
  };
}

export function combatAction(
  state: GameState,
  action: "出手" | "术法" | "服药" | "遁走",
): GameState {
  const s = clone(state);
  const c = s.character;
  const cb = s.combat;
  if (!c || !cb || cb.over) return s;
  const enemy = getEnemy(cb.enemyId)!;
  const clog = (t: string) => cb.log.push(t);

  if (action === "遁走") {
    if (!enemy.fleeable) {
      clog("此敌封锁四野,遁走无门!");
    } else {
      const v = doRoll(s, "D100", "遁走");
      const target = 40 + c.attributes.qiYun * 3;
      if (v <= target) {
        cb.over = true;
        cb.result = "fled";
        clog(`汝掷出 D100=${v}(需 ≤${target}),抽身遁走,不辨东西。`);
        pushLog(s, { speaker: "战斗", text: `狼狈遁走,保得性命。` });
        s.phase = "playing";
        s.combat = null;
        lifecycleCheck(s);
        return s;
      }
      clog(`汝掷出 D100=${v}(需 ≤${target}),遁走失败,破绽大露!`);
    }
  } else if (action === "服药") {
    const pill = c.inventory.find((st) => {
      const def = getItem(st.itemId);
      return def?.kind === "pill" && (def.effect?.hp ?? 0) > 0;
    });
    if (!pill) {
      clog("囊中并无疗伤丹药!");
    } else {
      const def = getItem(pill.itemId)!;
      removeItem(c, pill.itemId, 1);
      c.hp = Math.min(c.maxHp, c.hp + (def.effect?.hp ?? 0));
      cb.playerHp = c.hp;
      clog(`汝吞下「${def.name}」,气血回升 ${def.effect?.hp}。`);
    }
  } else {
    const mult = action === "术法" ? 1.4 : 1;
    const pv = doRoll(s, "D20", `攻击·${action}`);
    const pdmg = Math.max(1, Math.round(powerOf(c) * mult * (0.5 + pv / 20)));
    cb.enemyHp = Math.max(0, cb.enemyHp - pdmg);
    clog(`汝${action === "术法" ? "催动术法" : "出手"},D20=${pv},予敌 ${pdmg} 伤。`);
    if (cb.enemyHp <= 0) {
      cb.over = true;
      cb.result = "win";
      const sv = doRoll(s, "D100", "战利·灵石");
      const stones = enemy.spiritStones[0] + Math.round(((enemy.spiritStones[1] - enemy.spiritStones[0]) * sv) / 100);
      c.spiritStones += stones;
      const drops: string[] = [];
      for (const l of enemy.loot) {
        const lv = doRoll(s, "D100", `战利·${getItem(l.itemId)?.name ?? l.itemId}`);
        if (lv <= l.chance) {
          addItem(c, l.itemId, 1);
          drops.push(getItem(l.itemId)?.name ?? l.itemId);
        }
      }
      clog(`「${enemy.name}」倒地气绝。得灵石 ${stones}${drops.length ? ",拾得:" + drops.join("、") : ""}。`);
      pushLog(s, { speaker: "战斗", tone: "jade", text: `斩「${enemy.name}」,得灵石 ${stones}${drops.length ? ",获 " + drops.join("、") : ""}。` });
      s.killCount = (s.killCount ?? 0) + 1;
      s.phase = "playing";
      checkQuests(s);
      lifecycleCheck(s);
      return s;
    }
  }

  // enemy turn
  const ev = doRoll(s, "D20", "敌方攻击");
  const edmg = Math.max(1, Math.round(enemy.power * (0.5 + ev / 20) - defenseOf(c) * 0.3));
  c.hp = Math.max(0, c.hp - edmg);
  cb.playerHp = c.hp;
  clog(`「${enemy.name}」扑袭,D20=${ev},汝受 ${edmg} 伤。`);
  cb.round += 1;

  if (c.hp <= 0) {
    cb.over = true;
    cb.result = "dead";
    clog("汝力竭倒地,再无声息。");
    pushLog(s, { speaker: "天道", tone: "danger", text: `汝殒身于「${enemy.name}」爪牙之下。天地不仁。` });
    endRun(s, "combat_death", "身死道消", `${s.character!.name}战殁于${realmLabel(c.realm)},享年${c.age}。`);
  }
  return s;
}

export function closeCombat(state: GameState): GameState {
  const s = clone(state);
  if (s.combat?.over && s.phase === "combat") {
    s.phase = "playing";
    s.combat = null;
  }
  return s;
}

// ===== breakthrough =====
export interface BreakthroughAttempt {
  fromLabel: string;
  toLabel: string;
  chance: number;
  roll: number;
  success: boolean;
  died: boolean;
  narrative: string;
}

export function atMajorGate(c: Character): boolean {
  if (c.realm.realm === "qi") return c.realm.qiLayer >= 13 && c.realm.exp >= c.realm.expNeeded;
  if (c.realm.realm === "mortal") return false;
  return c.realm.stage === "大圆满" && c.realm.exp >= c.realm.expNeeded && c.realm.realm !== "deity";
}

export function attemptBreakthrough(state: GameState): { state: GameState; result: BreakthroughAttempt | null } {
  const s = clone(state);
  const c = s.character;
  if (!c || s.phase !== "playing") return { state: s, result: null };
  if (!atMajorGate(c)) {
    pushLog(s, { speaker: "天道", text: "根基未满,强突则死。汝且回去,继续磨汝之骨。" });
    return { state: s, result: null };
  }
  const from = realmLabel(c.realm);
  const to = REALM_BY_ID[nextRealm(c.realm.realm)!].name;
  const chance = breakthroughChance(c);
  const v = doRoll(s, "D100", `突破·${to}`);
  const success = v <= chance;
  let died = false;
  let narrative: string;

  delete c.flags.breakthroughBonus;

  if (success) {
    const nr = nextRealm(c.realm.realm)!;
    c.realm = { realm: nr, qiLayer: 0, stage: "初期", exp: 0, expNeeded: REALM_BY_ID[nr].baseExpPerLevel[0] ?? 100 };
    c.lifespan = lifespanFor(nr);
    c.maxHp = maxHpOf(c);
    c.hp = c.maxHp;
    delete c.flags.bottleneck;
    delete c.flags.failStreak;
    narrative = `雷云散尽,气象一新。汝已成${REALM_BY_ID[nr].name}修士,寿元增至${c.lifespan}。`;
    pushLog(s, { speaker: "天道", tone: "gold", text: `天地灵气如百川归海——${from},破而后立。${narrative}` });
    if (nr === "deity") {
      pushLog(s, { speaker: "天道", tone: "gold", text: "化神已成。飞升之门,遥遥在望。" });
    }
  } else {
    const def = REALM_BY_ID[c.realm.realm];
    c.realm.exp = Math.round(c.realm.exp * (1 - (def.failurePenalty.expLossMin ?? 0.3)));
    const streak = ((c.flags.failStreak as number | undefined) ?? 0) + 1;
    c.flags.failStreak = streak;
    if (streak >= 2) c.flags.bottleneck = true;
    const iv = doRoll(s, "D100", "突破失败·伤势");
    if (def.failurePenalty.deathChance > 0) {
      const dv = doRoll(s, "D100", "突破失败·生死");
      if (dv <= def.failurePenalty.deathChance) died = true;
    }
    if (died) {
      narrative = "气机彻底崩毁,道基寸裂。汝之道,止于此矣。";
      pushLog(s, { speaker: "天道", tone: "danger", text: narrative });
      endRun(s, "breakthrough_death", "走火入魔", `${c.name}强行突破${to}失败,形神俱灭,享年${c.age}。`);
    } else {
      if (iv <= def.failurePenalty.injuryChance) {
        c.injuries.push({ id: `inj_bt_${s.turn}`, name: "心魔反噬", severity: 2, turnsLeft: 8, effect: { speed: 0.25, breakthrough: 0.05 } });
        narrative = "气机逆行,经脉俱震,心魔趁虚而入。汝之道,止步于此乎?";
      } else {
        narrative = "一线之隔,终究未能踏过。天堑仍是天堑。";
      }
      c.hp = Math.max(1, Math.round(c.hp * 0.5));
      pushLog(s, { speaker: "天道", tone: "danger", text: narrative + (c.flags.bottleneck ? "(连败成障,瓶颈已生)" : "") });
    }
  }
  advanceTime(s);
  lifecycleCheck(s);
  return {
    state: s,
    result: { fromLabel: from, toLabel: to, chance, roll: v, success, died, narrative },
  };
}

// ===== commands =====
function gainExp(s: GameState, amount: number): void {
  const c = s.character!;
  c.realm.exp += amount;
  // mortal → qi 引气入体
  if (c.realm.realm === "mortal" && c.realm.exp >= c.realm.expNeeded) {
    c.realm = { realm: "qi", qiLayer: 1, stage: "初期", exp: 0, expNeeded: REALM_BY_ID.qi.baseExpPerLevel[0] ?? 100 };
    c.lifespan = lifespanFor("qi");
    c.maxHp = maxHpOf(c);
    c.hp = c.maxHp;
    pushLog(s, { speaker: "天道", tone: "gold", text: "一缕灵气自百会而入,涓涓入海——引气入体,炼气一层。汝自此非凡人。" });
    return;
  }
  // qi auto layer-up 1→13
  if (c.realm.realm === "qi") {
    while (c.realm.qiLayer < 13 && c.realm.exp >= c.realm.expNeeded) {
      c.realm.exp -= c.realm.expNeeded;
      c.realm.qiLayer += 1;
      c.realm.expNeeded = REALM_BY_ID.qi.baseExpPerLevel[Math.min(c.realm.qiLayer - 1, 12)] ?? 100;
      c.maxHp = maxHpOf(c);
      pushLog(s, { speaker: "系统", tone: "jade", text: `修为精进——${realmLabel(c.realm)}。` });
    }
    if (c.realm.qiLayer >= 13 && c.realm.exp >= c.realm.expNeeded) {
      c.realm.exp = c.realm.expNeeded;
      pushLog(s, { speaker: "系统", tone: "gold", text: "炼气十三层圆满。筑基天堑,已在眼前——可【突破】。" });
    }
    return;
  }
  // foundation+ stage-up
  const def = REALM_BY_ID[c.realm.realm];
  const stages = def.stages ?? [];
  while (c.realm.stage !== "大圆满" && c.realm.exp >= c.realm.expNeeded) {
    c.realm.exp -= c.realm.expNeeded;
    const idx = stages.indexOf(c.realm.stage);
    const nextStage = stages[idx + 1];
    if (!nextStage) break;
    c.realm.stage = nextStage;
    c.realm.expNeeded = def.baseExpPerLevel[Math.min(idx + 1, def.baseExpPerLevel.length - 1)] ?? 100;
    c.maxHp = maxHpOf(c);
    pushLog(s, { speaker: "系统", tone: "jade", text: `境界稳固——${realmLabel(c.realm)}。` });
  }
  if (c.realm.stage === "大圆满" && c.realm.exp >= c.realm.expNeeded) {
    c.realm.exp = c.realm.expNeeded;
    if (c.realm.realm === "deity") {
      pushLog(s, { speaker: "天道", tone: "gold", text: "化神大圆满。天门轰然洞开,金光垂落——" });
      endRun(s, "ascension", "飞升之门", `${c.name}修至化神大圆满,白日飞升,享年${c.age}。此界因果,就此了结。`);
    } else {
      pushLog(s, { speaker: "系统", tone: "gold", text: `${realmLabel(c.realm)},可【突破】矣。` });
    }
  }
}

export interface CommandOutcome {
  state: GameState;
  pendingEvent: PendingEvent | null;
  /** view the UI should open, when the command is a free action */
  openView?: "panel" | "inventory" | "quests" | "market" | "alchemy" | "audit";
}

const VIEW_COMMANDS: Record<string, CommandOutcome["openView"]> = {
  面板: "panel",
  背包: "inventory",
  任务: "quests",
  坊市: "market",
  炼丹: "alchemy",
  审计: "audit",
};

export function runCommand(state: GameState, raw: string): CommandOutcome {
  const s = clone(state);
  const c = s.character;
  const cmd = raw.trim();
  if (!c || s.phase !== "playing" || !cmd) return { state: s, pendingEvent: null };

  // free actions → open views
  const view = VIEW_COMMANDS[cmd];
  if (view) return { state: s, pendingEvent: null, openView: view };

  if (cmd === "保存") {
    pushLog(s, { speaker: "系统", text: "天机已录,因果已存。" });
    return { state: s, pendingEvent: null };
  }

  let pendingEvent: PendingEvent | null = null;

  if (cmd === "修炼") {
    const gain = cultivationGain(c);
    gainExp(s, gain);
    if (s.phase === "playing") {
      const lines = [
        `汝吐纳三月,不觉寒暑。(修为 +${gain})`,
        `灵气如丝,汇于丹田。(修为 +${gain})`,
        `枯坐蒲团,道行渐深。(修为 +${gain})`,
      ];
      pushLog(s, { speaker: "天道", text: lines[s.turn % lines.length] ?? lines[0]! });
      advanceTime(s);
      pendingEvent = rollTurnEvent(s);
    }
  } else if (cmd === "突破") {
    // handled by attemptBreakthrough in the store (needs modal payload)
    return { state: s, pendingEvent: null };
  } else if (cmd === "探索") {
    const v = doRoll(s, "D100", "探索");
    const shifted = Math.max(1, Math.min(100, v + (c.attributes.qiYun - 5) * 2));
    if (shifted <= 20) {
      pushLog(s, { speaker: "天道", tone: "danger", text: "荒岭深处,汝惊动了不该惊动之物。" });
      startCombatInner(s, pickEnemy(s));
    } else if (shifted <= 45) {
      pushLog(s, { speaker: "天道", text: "跋山涉水,一无所获。汝之草鞋,又磨穿一双。" });
    } else if (shifted <= 75) {
      const n = 1 + (v % 3);
      addItem(c, "lingcao", n);
      pushLog(s, { speaker: "天道", tone: "jade", text: `幽谷之中觅得灵草。(灵草 ×${n})` });
    } else if (shifted <= 92) {
      const stones = 10 + v;
      c.spiritStones += stones;
      pushLog(s, { speaker: "天道", tone: "jade", text: `残破的山神庙里,香炉之下藏着一小袋灵石。(灵石 +${stones})` });
    } else {
      addItem(c, "yaodan", 1);
      const stones = 30 + v;
      c.spiritStones += stones;
      pushLog(s, { speaker: "天道", tone: "gold", text: `妖兽斗法两败俱伤之地,汝捡了个便宜。(灵石 +${stones},妖丹 ×1)` });
    }
    if (s.phase === "playing") {
      advanceTime(s);
      pendingEvent = rollTurnEvent(s);
    }
  } else if (cmd.startsWith("使用")) {
    const name = cmd.slice(2).trim();
    return { state: consumeItemByName(s, name), pendingEvent: null };
  } else if (cmd.startsWith("装备")) {
    const name = cmd.slice(2).trim();
    return { state: equipItemByName(s, name), pendingEvent: null };
  } else if (cmd.startsWith("赠礼")) {
    const name = cmd.slice(2).trim();
    const npc = Object.values(s.npcs).find((n) => n.name === name)
      ?? Object.values(s.npcs).find((n) => name.length >= 2 && n.name.includes(name));
    if (!npc) {
      pushLog(s, { speaker: "系统", tone: "muted", text: "汝所言之人,不在此界名册。(赠礼 <人名>)" });
    } else if (c.spiritStones < 20) {
      pushLog(s, { speaker: "系统", tone: "muted", text: "两手空空,何以为礼。(需灵石 20)" });
    } else {
      c.spiritStones -= 20;
      const before = npc.favor;
      npc.favor = Math.min(100, npc.favor + 5);
      pushLog(s, { speaker: "汝", tone: "muted", text: `奉上灵石二十枚,赠予${npc.name}。` });
      pushLog(s, { speaker: "系统", tone: "jade", text: `${npc.name}对汝好感渐生。(好感 ${before} → ${npc.favor})` });
      for (const t of npc.thresholds) {
        if (!t.done && before < t.at && npc.favor >= t.at) {
          t.done = true;
          pushLog(s, { speaker: "系统", tone: "gold", text: `【${npc.name}】${t.unlock}。` });
        }
      }
    }
  } else if (cmd === "帮助" || cmd.toLowerCase() === "help") {
    pushLog(s, { speaker: "系统", text: "可用指令:修炼 / 突破 / 探索 / 坊市 / 炼丹 / 背包 / 任务 / 面板 / 审计 / 使用 <物品> / 装备 <物品> / 赠礼 <人名> / 保存 / 重开。" });
  } else {
    pushLog(s, { speaker: "天道", text: "天道不受愿。" });
  }

  checkQuests(s);
  lifecycleCheck(s);
  return { state: s, pendingEvent };
}

// ===== item / economy actions =====
export { consumeItemByName as useItemByName };

export function consumeItemByName(state: GameState, name: string): GameState {
  const s = clone(state);
  const c = s.character;
  if (!c) return s;
  const stack = c.inventory.find((st) => getItem(st.itemId)?.name === name || st.itemId === name);
  const def = stack ? getItem(stack.itemId) : undefined;
  if (!stack || !def) {
    pushLog(s, { speaker: "系统", text: `储物袋中并无「${name}」。` });
    return s;
  }
  if (!def.effect) {
    pushLog(s, { speaker: "系统", text: `「${def.name}」无法直接服用。` });
    return s;
  }
  removeItem(c, stack.itemId, 1);
  const parts: string[] = [];
  if (def.effect.hp) {
    c.hp = Math.min(c.maxHp, c.hp + def.effect.hp);
    parts.push(`气血 +${def.effect.hp}`);
  }
  if (def.effect.exp) {
    gainExp(s, def.effect.exp);
    parts.push(`修为 +${def.effect.exp}`);
  }
  if (def.effect.breakthroughBonus) {
    c.flags.breakthroughBonus = ((c.flags.breakthroughBonus as number | undefined) ?? 0) + def.effect.breakthroughBonus;
    parts.push(`下次突破 +${def.effect.breakthroughBonus}%`);
  }
  if (def.effect.cureInjury && c.injuries.length > 0) {
    const cured = c.injuries.shift()!;
    parts.push(`解「${cured.name}」`);
  }
  if (def.effect.attribute) {
    const [attr, delta] = def.effect.attribute;
    if (attr !== "jiYuan") {
      c.attributes[attr] += delta;
      c.maxHp = maxHpOf(c);
      parts.push(`${attr === "genGu" ? "根骨" : attr === "wuXing" ? "悟性" : attr === "xinXing" ? "心性" : "气运"} +${delta}`);
    }
  }
  pushLog(s, { speaker: "系统", tone: "jade", text: `服下「${def.name}」。${parts.join(",")}。` });
  checkQuests(s);
  return s;
}

export function equipItemByName(state: GameState, name: string): GameState {
  const s = clone(state);
  const c = s.character;
  if (!c) return s;
  const stack = c.inventory.find((st) => getItem(st.itemId)?.name === name || st.itemId === name);
  const def = stack ? getItem(stack.itemId) : undefined;
  if (!stack || !def) {
    pushLog(s, { speaker: "系统", text: `储物袋中并无「${name}」。` });
    return s;
  }
  const slot = def.kind === "weapon" ? "weapon" : def.kind === "armor" ? "armor" : def.kind === "misc" ? "accessory" : null;
  if (!slot) {
    pushLog(s, { speaker: "系统", text: `「${def.name}」非可装备之物。` });
    return s;
  }
  c.equipped[slot] = def.id;
  pushLog(s, { speaker: "系统", tone: "jade", text: `已装备「${def.name}」。` });
  return s;
}

export function chooseQuestOption(state: GameState, questId: string, choiceIdx: number): GameState {
  const s = clone(state);
  const c = s.character;
  const q = s.quests.find((x) => x.id === questId);
  if (!c || !q || q.status !== "active" || !q.choices?.[choiceIdx]) return s;
  const choice = q.choices[choiceIdx];
  q.status = "done";
  pushLog(s, { speaker: "天道", text: `汝择「${choice.text}」。${choice.effect?.narrative ?? ""}` });
  if (choice.effect?.spiritStones) c.spiritStones += choice.effect.spiritStones;
  if (choice.effect?.exp) gainExp(s, choice.effect.exp);
  if (choice.effect?.flag) c.flags[choice.effect.flag[0]] = choice.effect.flag[1];
  checkQuests(s);
  return s;
}

export function buyItem(state: GameState, itemId: string): GameState {
  const s = clone(state);
  const c = s.character;
  const def = getItem(itemId);
  if (!c || !def) return s;
  if (c.spiritStones < def.price) {
    pushLog(s, { speaker: "系统", text: `灵石不足。「${def.name}」需 ${def.price} 灵石。` });
    return s;
  }
  c.spiritStones -= def.price;
  addItem(c, itemId, 1);
  pushLog(s, { speaker: "系统", tone: "jade", text: `购入「${def.name}」,费灵石 ${def.price}。` });
  checkQuests(s);
  return s;
}

export function sellItem(state: GameState, itemId: string): GameState {
  const s = clone(state);
  const c = s.character;
  const def = getItem(itemId);
  if (!c || !def) return s;
  if (!removeItem(c, itemId, 1)) return s;
  const rate = c.flags.shrewd ? 0.6 : 0.5;
  const gain = Math.max(1, Math.floor(def.price * rate));
  c.spiritStones += gain;
  if (c.equipped.weapon === itemId && countItem(c, itemId) === 0) delete c.equipped.weapon;
  if (c.equipped.armor === itemId && countItem(c, itemId) === 0) delete c.equipped.armor;
  if (c.equipped.accessory === itemId && countItem(c, itemId) === 0) delete c.equipped.accessory;
  pushLog(s, { speaker: "系统", text: `售出「${def.name}」,得灵石 ${gain}。` });
  return s;
}

export interface AlchemyOutcome {
  state: GameState;
  roll: number;
  target: number;
  success: boolean;
  resultName: string;
  pendingEvent: PendingEvent | null;
}

export function brewRecipe(state: GameState, recipeId: string): AlchemyOutcome | { state: GameState; error: string } {
  const s = clone(state);
  const c = s.character;
  const recipe = getRecipe(recipeId);
  if (!c || !recipe) return { state: s, error: "丹方不存" };
  if (c.spiritStones < recipe.fee) return { state: s, error: `炉火之资不足(需 ${recipe.fee} 灵石)` };
  for (const m of recipe.materials) {
    if (countItem(c, m.itemId) < m.count) {
      return { state: s, error: `药材不足:${getItem(m.itemId)?.name} ×${m.count}` };
    }
  }
  c.spiritStones -= recipe.fee;
  for (const m of recipe.materials) removeItem(c, m.itemId, m.count);
  const target = Math.min(95, recipe.baseSuccess + c.attributes.wuXing * 2 + (c.flags.herbLore ? 10 : 0));
  const v = doRoll(s, "D100", `炼丹·${recipe.name}`);
  const success = v <= target;
  const resultName = getItem(recipe.resultItemId)?.name ?? recipe.name;
  if (success) {
    addItem(c, recipe.resultItemId, 1);
    pushLog(s, { speaker: "系统", tone: "jade", text: `丹成——「${resultName}」×1。(D100=${v},需 ≤${target})` });
  } else {
    pushLog(s, { speaker: "天道", text: `炉中一声闷响,药材尽成焦土。(D100=${v},需 ≤${target})火候未到,心亦未到。` });
  }
  advanceTime(s);
  const pendingEvent = rollTurnEvent(s);
  checkQuests(s);
  lifecycleCheck(s);
  return { state: s, roll: v, target, success, resultName, pendingEvent };
}
