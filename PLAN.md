# 《凡人修仙传·人生模拟器》实现计划
## Mortal Cultivation Life Simulator — Implementation Plan

A single-player, text-driven cultivation (xianxia) life simulator running fully in the browser.
All game logic is client-side TypeScript; saves persist to `localStorage`. The narrator is 天道
(Heaven's Dao): cold, restrained, classical Chinese prose. All randomness flows through a single
seeded, audited dice engine (D100/D20) so the game is fair, reproducible, and cheat-proof.

**Stack:** Next.js 14+ (App Router, static-exportable) · TypeScript (strict) · Tailwind CSS ·
shadcn/ui · Zustand (+persist) · Framer Motion · Vitest (engine unit tests)

**No server, no Python, no database.** `next build` must pass; deployable to Vercel or any
static host (`output: 'export'` compatible — no server actions, no API routes).

---

## 1. Project Structure

```
/workspace
├── PLAN.md
├── README.md
├── package.json
├── next.config.mjs               # output: 'export' — pure static build
├── tailwind.config.ts            # xianxia theme tokens (jade/gold/ink)
├── tsconfig.json                 # strict: true
├── components.json               # shadcn/ui config
├── vitest.config.ts
├── public/
│   └── textures/                 # paper grain, ink wash SVG/PNG backgrounds
└── src/
    ├── app/
    │   ├── layout.tsx            # fonts, theme, global providers
    │   ├── globals.css           # theme CSS vars, textures, animations
    │   ├── page.tsx              # title screen: 开始游戏 / 继续 / 重开
    │   └── game/
    │       └── page.tsx          # single game screen ("use client")
    │
    ├── engine/                   # PURE TypeScript — zero React imports, fully unit-testable
    │   ├── types.ts              # all data model interfaces (§2)
    │   ├── rng.ts                # seeded PRNG + audited dice (D100/D20/D6)
    │   ├── audit.ts              # roll log, state hash, 9-layer anti-cheat (§3.9)
    │   ├── creation.ts           # 4-step character creation state machine
    │   ├── attributes.ts         # 5-attribute math, derived stats
    │   ├── realms.ts             # realm/stage progression rules, lifespan
    │   ├── cultivation.ts        # 修炼: exp per turn, speed formula
    │   ├── breakthrough.ts       # 突破: chance formula, D100 check, failure fallout
    │   ├── combat.ts             # dice combat: power calc, rounds, flee/win/death
    │   ├── events.ts             # per-turn D100 event table, weighted by realm/luck
    │   ├── exploration.ts        # 探索: locations, discovery tables
    │   ├── economy.ts            # spirit stones, 坊市 buy/sell, pricing
    │   ├── alchemy.ts            # 炼丹: recipes, success roll, pill effects
    │   ├── inventory.ts          # item stacks, equip, use
    │   ├── npc.ts                # NPC registry + favor (好感) system
    │   ├── quests.ts             # main story (3-choice nodes) + side quests
    │   ├── lifecycle.ts          # age/lifespan/death, endings
    │   ├── narrative.ts          # classical-Chinese text templater (cold tone)
    │   ├── commands.ts           # command parser/dispatcher (whitelist)
    │   ├── turn.ts               # turn resolver: command → engine → GameState' + log
    │   └── save.ts               # versioned save/load, checksum, migration
    │
    ├── data/                     # static game content (typed const objects) (§6)
    │   ├── origins.ts            # 6 origins
    │   ├── spiritRoots.ts        # D100 lottery table
    │   ├── realmData.ts          # 凡人→炼气1-13→筑基→金丹→元婴→化神
    │   ├── techniques.ts         # 功法 (cultivation methods + combat arts)
    │   ├── items.ts              # pills, weapons, talismans, materials
    │   ├── recipes.ts            # alchemy recipes
    │   ├── eventTable.ts         # random events (D100 buckets per realm tier)
    │   ├── locations.ts          # exploration map
    │   ├── npcs.ts               # named NPCs + dispositions
    │   ├── quests.ts             # main arc chapters + side quests
    │   ├── endings.ts            # death/ascension/retirement endings
    │   └── names.ts              # random name pools (sects, mortals, enemies)
    │
    ├── store/
    │   └── gameStore.ts          # Zustand store wrapping engine; persist→localStorage
    │
    ├── components/
    │   ├── ui/                   # shadcn/ui primitives (button, card, dialog, sheet,
    │   │                         #   tabs, progress, scroll-area, tooltip, badge, sonner)
    │   └── game/
    │       ├── NarrativeLog.tsx      # scrolling 天道 narration, typewriter effect
    │       ├── CommandBar.tsx        # command buttons + free-text input
    │       ├── CharacterPanel.tsx    # 【面板】 sheet/drawer
    │       ├── DiceRoll.tsx          # animated D100 roll reveal
    │       ├── creation/
    │       │   ├── OriginStep.tsx        # step 1: 出身 (6 cards)
    │       │   ├── AttributeStep.tsx     # step 2: point allocation
    │       │   ├── SpiritRootStep.tsx    # step 3: D100 lottery w/ animation
    │       │   └── HiddenRollStep.tsx    # step 4: sealed hidden roll (机缘)
    │       ├── CombatView.tsx        # HP bars, round log, actions
    │       ├── BreakthroughModal.tsx # tension animation + result
    │       ├── MarketView.tsx        # 坊市 buy/sell
    │       ├── AlchemyView.tsx       # 炼丹 recipe select + furnace roll
    │       ├── InventoryView.tsx     # 储物袋
    │       ├── QuestView.tsx         # 任务 main/side list
    │       ├── AuditView.tsx         # 审计: full roll history
    │       ├── TopBar.tsx            # name/realm/age/寿元/灵石 status strip
    │       └── EndingScreen.tsx      # death/ending summary + 重开
    │
    └── lib/
        ├── utils.ts              # cn() etc. (shadcn)
        └── fonts.ts              # Noto Serif SC / Ma Shan Zheng loaders
```

**Architecture rule:** `src/engine/**` and `src/data/**` never import React or browser APIs
(except `save.ts`'s storage adapter, injected). Every game rule is a pure function
`(state, input, rng) → (state', logs[])`. React components only render state and dispatch
commands. This makes the whole game engine testable with Vitest and keeps UI thin.

---

## 2. Data Models (`src/engine/types.ts`)

```ts
// ===== Dice & Audit =====
export interface DiceRoll {
  id: number;              // monotonic sequence
  turn: number;
  die: 'D100' | 'D20' | 'D6';
  value: number;
  reason: string;          // e.g. "灵根抽取", "突破·筑基", "遭遇事件"
  seedState: string;       // PRNG state snapshot (audit/replay)
}

// ===== Attributes (五维) =====
export interface Attributes {
  genGu: number;    // 根骨 constitution — HP, breakthrough success
  wuXing: number;   // 悟性 comprehension — cultivation speed, technique learning
  xinXing: number;  // 心性 temperament — heart-demon resistance, event options
  jiYuan: number;   // 机缘 fortune (HIDDEN — never shown on panel)
  qiYun: number;    // 气运 luck — event table shift, loot quality
}

// ===== Spirit Root (灵根) =====
export type Element = '金' | '木' | '水' | '火' | '土';
export interface SpiritRoot {
  grade: '天灵根' | '异灵根' | '真灵根' | '双灵根' | '三灵根' | '四灵根' | '五灵根';
  elements: Element[];
  speedMultiplier: number;   // 天灵根 3.0 … 五灵根(伪灵根) 0.5
  rollValue: number;         // the D100 that produced it
}

// ===== Realm (境界) =====
export type RealmId = 'mortal' | 'qi' | 'foundation' | 'core' | 'nascent' | 'deity';
export type Stage = '初期' | '中期' | '后期' | '大圆满';
export interface RealmState {
  realm: RealmId;
  qiLayer: number;           // 炼气 1–13 (0 outside qi refining)
  stage: Stage;              // for 筑基 and above
  exp: number;               // progress toward next layer/stage
  expNeeded: number;
}
export interface RealmDef {   // in data/realmData.ts
  id: RealmId; name: string; lifespanBonus: number;
  layers?: number;                       // qi: 13
  stages?: Stage[];
  baseExpPerLevel: number[]; powerBase: number;
  breakthroughBaseChance: number;        // major-realm gate
  failurePenalty: { expLoss: number; injuryChance: number; deathChance: number };
}

// ===== Character =====
export interface Character {
  name: string;
  gender: '男' | '女';
  originId: string;
  attributes: Attributes;
  spiritRoot: SpiritRoot;
  realm: RealmState;
  age: number; lifespan: number;         // 寿元 grows with realm
  hp: number; maxHp: number;
  injuries: Injury[];                    // from failed breakthroughs / combat
  techniqueId: string | null;            // equipped 功法
  combatArts: string[];                  // learned 战斗术法
  spiritStones: number;                  // 灵石
  inventory: ItemStack[];
  equipped: { weapon?: string; armor?: string; accessory?: string };
  sectId: string | null;                 // 宗门 membership
  flags: Record<string, boolean|number>; // story/event flags
}

export interface Injury { id: string; name: string; severity: 1|2|3; turnsLeft: number;
  effect: Partial<Record<'speed'|'power'|'breakthrough', number>> }

// ===== Content types =====
export interface Origin { id: string; name: string; desc: string;
  attributeMods: Partial<Attributes>; startSpiritStones: number;
  startItems: string[]; startFlags?: Record<string, boolean>;
  special: string }                       // e.g. 药铺学徒 knows herbs → alchemy bonus

export interface Technique { id: string; name: string; grade: '黄阶'|'玄阶'|'地阶'|'天阶';
  elementAffinity: Element[] | null; speedBonus: number; powerBonus: number;
  minRealm: RealmId; desc: string }

export type ItemKind = 'pill'|'weapon'|'armor'|'talisman'|'material'|'manual'|'misc';
export interface ItemDef { id: string; name: string; kind: ItemKind;
  grade: 1|2|3|4|5; price: number; desc: string;
  effect?: { hp?: number; exp?: number; breakthroughBonus?: number;
             attribute?: [keyof Attributes, number]; cureInjury?: boolean };
  power?: number; defense?: number }
export interface ItemStack { itemId: string; count: number }

export interface Recipe { id: string; resultItemId: string; name: string;
  materials: ItemStack[]; baseSuccess: number; minRealm: RealmId; fee: number }

// ===== Events =====
export interface GameEvent { id: string; name: string;
  realmTier: RealmId[]; weight: number;            // selected via D100 + 气运 shift
  narrative: string;                                // 天道 prose, template vars
  kind: 'fortune'|'neutral'|'danger'|'encounter'|'combat';
  choices?: EventChoice[];                          // 0 choices = auto-resolve
  autoEffect?: EventEffect }
export interface EventChoice { text: string;
  check?: { attr: keyof Attributes; dc: number };  // D20 + attr vs DC
  success: EventEffect; failure?: EventEffect }
export interface EventEffect { narrative: string;
  exp?: number; hp?: number; spiritStones?: number; items?: ItemStack[];
  favor?: [npcId: string, delta: number]; injury?: string;
  combat?: string /* enemyId */; flag?: [string, boolean|number]; death?: boolean }

// ===== Combat =====
export interface Enemy { id: string; name: string; realm: RealmState;
  power: number; hp: number; loot: { itemId: string; chance: number }[];
  spiritStones: [min: number, max: number]; fleeable: boolean }
export interface CombatState { enemyId: string; enemyHp: number; playerHp: number;
  round: number; log: string[]; over: boolean; result?: 'win'|'lose'|'fled'|'dead' }

// ===== NPC / Quests =====
export interface Npc { id: string; name: string; identity: string;
  favor: number;                                    // -100…100
  thresholds: { at: number; unlock: string }[] }    // gifts, techniques, quests
export interface Quest { id: string; kind: 'main'|'side'; chapter?: number;
  title: string; narrative: string;
  choices?: { text: string; outcomeQuestId?: string; effect?: EventEffect }[]; // main: 3 choices
  objective?: { type: 'reachRealm'|'killEnemy'|'obtainItem'|'favor'; target: string; n?: number };
  reward: EventEffect; status: 'locked'|'active'|'done'|'failed' }

// ===== Top-level GameState =====
export interface GameState {
  version: number;                 // save schema version
  seed: string; rngState: string;  // dice authority
  phase: 'title'|'creation'|'playing'|'combat'|'ended';
  creationStep: 0|1|2|3|4;         // mandatory 4-step gate
  turn: number;                    // 1 turn ≈ 3 months in-world
  character: Character | null;
  npcs: Record<string, Npc>;
  quests: Quest[];
  combat: CombatState | null;
  narrativeLog: LogEntry[];        // capped ring buffer (e.g. last 300)
  rolls: DiceRoll[];               // audit trail (capped, hash-chained)
  auditHash: string;               // chained checksum (§3.9)
  ending: { id: string; title: string; summary: string } | null;
}
export interface LogEntry { turn: number; speaker: '天道'|'系统'|'战斗';
  text: string; tone?: 'normal'|'gold'|'danger'|'jade' }
```

---

## 3. Core Engine Modules

### 3.1 `rng.ts` — Dice Authority
- `mulberry32`-style seeded PRNG; seed generated once at 开始游戏, stored in save.
- Single entry point: `roll(state, die, reason) → { value, roll: DiceRoll, nextState }`.
  Every roll appends to `state.rolls` with reason + PRNG state. **No other module may call
  `Math.random()`** (enforced by lint rule + code review).
- Deterministic: same seed + same command sequence ⇒ identical playthrough (replayable audits).

### 3.2 `creation.ts` — Mandatory 4-Step Character Creation
State machine; each step gates the next (`creationStep` 0→4). Cannot skip, cannot re-roll.
1. **出身 (Origin)** — pick 1 of 6 (see §6.1). Applies attribute mods, starting stones/items/flags.
2. **属性分配** — base 5 in each visible attribute (根骨/悟性/心性/气运) + 10 free points, cap 10
   at creation. 机缘 is NOT allocatable.
3. **灵根抽取** — one D100 against the lottery table (§6.2), animated reveal, result is final.
4. **暗掷 (Hidden Roll)** — one sealed D100 sets 机缘 (mapped 1–10). Player sees only
   “天道已掷,命数已定” — the value is never displayed anywhere (including 面板 and 审计 detail;
   the audit shows the roll happened, not its mapping).

### 3.3 `cultivation.ts` + `breakthrough.ts`
- **修炼 (per turn):**
  `exp += baseExp(realm) × spiritRoot.speedMultiplier × (1 + 悟性×0.05) × techniqueBonus × injuryPenalty × pillBuff`
- Layer-ups within 炼气 (1→13) are automatic when exp fills; **major breakthroughs**
  (炼气13→筑基, 筑基大圆满→金丹, …) require the 突破 command:
  `chance = base(realm) + 根骨×2 + 心性×1 + pillBonus + flagBonus − injuryPenalty` → D100 ≤ chance.
- **Failure:** lose 30–50% exp; D100 vs injury (heart-demon 心魔 injury reduces speed);
  金丹+ failures carry a small death chance. 天道 narrates both outcomes coldly.
- Bottleneck rule: after 2 consecutive failures a `bottleneck` flag halves chance until
  resolved by pill/event (creates economy & event pull).

### 3.4 `combat.ts`
- `power = realmPowerBase × stageMult + 根骨×3 + weaponPower + artPower + techniquePowerBonus`.
- Round: both sides roll D20; `damage = attacker.power × (0.5 + roll/20) − defender.defense×0.3`
  (min 1). Player actions: 出手 / 术法 (art: costs nothing in MVP, +power) / 服药 (use pill) /
  遁走 (flee: D100 ≤ 40 + 气运×3, blocked if `fleeable: false`).
- Lose ⇒ usually robbed/injured; some enemies (kind `danger`) kill — 天道 announces death, run ends.

### 3.5 `events.ts` — Per-Turn D100
- Each turn ends with an event roll: D100 shifted by `气运` (`effective = clamp(roll + (气运−5)×2)`).
  Buckets: 1–10 大凶, 11–30 小凶, 31–70 平, 71–90 小吉, 91–100 大吉.
- A weighted pick from `eventTable.ts` filtered by realm tier & flags; hidden 机缘 gates a few
  rare “destiny” events (机缘 ≥ 8 unlocks e.g. 前辈洞府). Choice checks: D20 + attr vs DC.

### 3.6 `economy.ts` + `alchemy.ts` + `inventory.ts`
- 灵石 single currency. 坊市: buy at list price, sell at 50%; stock filtered by realm tier.
- 炼丹: pick recipe → consume materials + fee → D100 ≤ baseSuccess + 悟性×2 (+origin bonus)
  → pill or wasted materials. Pills: heal, exp, breakthrough bonus (consumed on next 突破), cures.
- Inventory: stacks, equip weapon/armor/accessory, use consumables anywhere except mid-creation.

### 3.7 `npc.ts` + `quests.ts`
- Favor −100…100 changed by events/quests/gifts; thresholds unlock techniques, discounts, aid,
  or (negative) ambush events. MVP ships ~6 named NPCs.
- Main story: 3 chapters, each a 3-choice node (choices branch flags/rewards, converge on the
  next chapter to keep MVP scope sane). Side quests: objective-based (kill/obtain/reach/favor).

### 3.8 `lifecycle.ts` + `narrative.ts`
- 1 turn = 3 months; +1 age per 4 turns. Lifespan: 凡人 80 / 炼气 120 / 筑基 200 / 金丹 500 /
  元婴 1000 / 化神 1500. Age ≥ lifespan ⇒ 坐化 ending. HP ≤ 0 ⇒ 身死道消 ending.
  化神大圆满 ⇒ MVP victory ending (飞升之门).
- `narrative.ts`: template bank of cold, classical lines keyed by (module, outcome, tier), e.g.
  breakthrough failure: “气机逆行,经脉俱震。汝之道,止步于此乎?” Never exclamation-heavy,
  never praise; 天道 observes, does not console.

### 3.9 `audit.ts` — 9-Layer Anti-Cheat
1. **Dice authority** — all randomness via `rng.roll`, logged with reason + PRNG state.
2. **Command whitelist** — parser accepts only known commands; free text like “我希望获得神器”
   returns 天道: “天道不受愿。” (no wishing).
3. **Hidden attribute seal** — 机缘 never serialized into any UI string; panel omits it.
4. **Seeded determinism** — seed fixed at game start; replaying commands reproduces the run.
5. **Hash chain** — `auditHash = sha256(prevHash + turn + command + rollValues)` updated每turn.
6. **Save integrity** — save blob stores `auditHash` + schema version; mismatch on load ⇒
   天道: “此界因果紊乱,不可续。” offer 重开 only.
7. **State invariants** — post-turn assertions (stones ≥ 0, exp bounds, realm order); violation
   rolls back the turn.
8. **Single-writer** — only `turn.ts` may produce a new GameState; UI has no setters.
9. **审计 command** — renders the full roll table (id/turn/die/value/reason) so the player can
   verify fairness themselves.

### 3.10 `commands.ts` + `turn.ts`
Whitelisted commands (buttons + typed input, Chinese):
`开始游戏` `面板` `修炼` `突破` `探索` `任务` `坊市` `炼丹` `背包` `使用 <物品>` `装备 <物品>`
`赠礼 <NPC>` `审计` `保存` `重开`; in combat: `出手` `术法` `服药` `遁走`.
`turn.ts` pipeline: validate → apply command module → advance time (for time-consuming commands:
修炼/探索/炼丹) → per-turn event roll → lifecycle check → narrative assembly → audit hash → persist.
(面板/背包/任务/审计/保存 are free actions — no turn cost, no event roll.)

### 3.11 `save.ts`
- Zustand `persist` (key `mcls_save_v1`) auto-saves after every turn; manual `保存` also offered.
- Versioned schema + migration hook; export/import save as Base64 string (nice-to-have, phase 8).
- 重开 requires a confirm dialog (“因果尽散,再入轮回?”), wipes state, generates a new seed.

---

## 4. UI Pages & Components

**Two routes only.** `/` (title) and `/game` (everything else — creation, play, combat, ending
are phases of one screen, driven by `GameState.phase`).

### `/` Title Screen
Full-bleed ink-wash dark backdrop, slow-drifting mist (CSS), vertical brush-style title
《凡人修仙传·人生模拟器》, three actions: **开始游戏** (new seed → creation), **继续**
(shown only if a save exists), **重开** (confirm → wipe). Footer: “天道无情,以万物为刍狗。”

### `/game` Main Screen (desktop 3-zone; mobile stacks with drawers)
```
┌──────────────────────────────────────────────────────────┐
│ TopBar: 姓名 · 境界(炼气七层) · 年岁/寿元 · 灵石 · [面板]  │
├───────────────────────────────┬──────────────────────────┤
│ NarrativeLog (scroll-area)    │ Context panel (tabs):     │
│  天道 narration, typewriter,  │  面板 / 背包 / 任务 /      │
│  gold text for 大吉, red for  │  坊市 / 炼丹 / 审计        │
│  danger, dice reveals inline  │  (Sheet drawer on mobile) │
├───────────────────────────────┴──────────────────────────┤
│ CommandBar: [修炼] [突破] [探索] [坊市] [炼丹] [任务] + 输入│
└──────────────────────────────────────────────────────────┘
```
- **Creation phase** replaces the whole board with a 4-step wizard (progress dots, no back
  button past a confirmed step). SpiritRootStep: D100 tumbles (Framer Motion number scramble)
  then the root name stamps in with a red seal (印章) effect.
- **CharacterPanel (面板):** shadcn Sheet — identity block, realm progress bar (jade), 4 visible
  attributes as engraved stat rows, spirit root badge, technique, injuries, equipment, 寿元 bar.
  机缘 intentionally absent.
- **CombatView:** overlays the log area; two HP bars, round-by-round entries, 4 action buttons;
  dice results animate before damage numbers apply.
- **BreakthroughModal:** dims screen, heartbeat pulse, D100 reveal vs target number, then
  success (gold flash + realm title calligraphy) or failure (screen crack + red vignette).
- **EndingScreen:** cause of death/ending title, life summary (years lived, peak realm, rolls
  made, stones earned), 天道's final one-liner, [重开].

---

## 5. Implementation Phases (build order)

**Phase 0 — Scaffold & Theme.** `create-next-app` (TS, Tailwind, App Router) → shadcn/ui init +
required components → fonts (Noto Serif SC, Ma Shan Zheng) → theme tokens & textures in
`globals.css` → `next.config.mjs` with `output: 'export'` → verify `next build` passes.
*Exit: styled empty title screen builds cleanly.*

**Phase 1 — Engine Foundation.** `types.ts`, `rng.ts`, `audit.ts`, `save.ts`, `gameStore.ts`,
`commands.ts` skeleton, `turn.ts` skeleton. Vitest set up; tests: RNG determinism, hash chain,
save round-trip. *Exit: engine core green.*

**Phase 2 — Character Creation.** `data/origins.ts`, `data/spiritRoots.ts`, `creation.ts`,
the 4 wizard components, dice animation. *Exit: full creation flow produces a valid Character.*

**Phase 3 — Core Loop: Panel + Cultivation + Breakthrough.** `data/realmData.ts`,
`data/techniques.ts`, `attributes.ts`, `realms.ts`, `cultivation.ts`, `breakthrough.ts`,
`lifecycle.ts`, `narrative.ts` bank v1; NarrativeLog, CommandBar, TopBar, CharacterPanel,
BreakthroughModal. *Exit: can cultivate 凡人→筑基, die of old age, see endings — the game is
already minimally playable here.*

**Phase 4 — Random Events + Exploration.** `data/eventTable.ts` (~40 events), `data/locations.ts`,
`events.ts`, `exploration.ts`, event-choice UI in the log. *Exit: every turn breathes; 探索 works.*

**Phase 5 — Combat.** `combat.ts`, enemy defs in `data/items.ts`/`eventTable.ts`, CombatView,
death flow. *Exit: encounter → fight/flee → loot or ending.*

**Phase 6 — Economy.** `data/items.ts` (~40 items), `data/recipes.ts`, `economy.ts`,
`alchemy.ts`, `inventory.ts`; Market/Alchemy/Inventory views; pill effects wired into
breakthrough/combat. *Exit: earn → buy → consume loop closes.*

**Phase 7 — NPCs + Quests.** `data/npcs.ts`, `data/quests.ts`, `npc.ts`, `quests.ts`,
QuestView, 赠礼; 3-chapter main story with 3-choice nodes. *Exit: main arc completable.*

**Phase 8 — Polish & Hardening.** AuditView, remaining anti-cheat layers (invariants, load
integrity), balance pass (target: reach 筑基 in ~30–50 turns), narrative bank v2, Framer Motion
polish, mobile layout, empty/edge states, save export/import. *Exit: feels premium.*

**Phase 9 — Ship.** `next build` + static export verified, Lighthouse sanity pass, README
(how to play, commands list, deploy instructions), final Vitest run.

Each phase ends with commit + push; Phases 3, 5, 7 each end with a manual playthrough.

---

## 6. Key Game Data Files

### 6.1 `origins.ts` — 6 出身
| id | 出身 | 修正 | 起始 | 特性 |
|---|---|---|---|---|
| farmer | 山村农户 | 根骨+2 | 5灵石 | 耐苦: injury turns −1 |
| scholar | 落魄书生 | 悟性+2 | 10灵石, 残卷 | 过目不忘: technique learn bonus |
| merchant | 商贾之子 | 气运+1 | 100灵石 | 市侩: 坊市 sell 60% |
| apothecary | 药铺学徒 | 悟性+1 心性+1 | 20灵石, 3草药 | 识药: alchemy +10% |
| hunter | 猎户遗孤 | 根骨+1 心性+1 | 8灵石, 铁弓 | 搏杀: combat power +5% |
| clan | 修仙家族旁系 | 全属性+0 | 50灵石, 聚气散 | 家学: starts with 黄阶功法 |

### 6.2 `spiritRoots.ts` — D100 lottery
| D100 | 灵根 | 速率 |
|---|---|---|
| 1–40 | 五灵根 (伪灵根) | 0.5× |
| 41–65 | 四灵根 | 0.7× |
| 66–82 | 三灵根 | 0.9× |
| 83–93 | 双灵根 | 1.2× |
| 94–97 | 真灵根 (单属性) | 1.6× |
| 98–99 | 异灵根 (变异: 雷/冰/风) | 2.2× |
| 100 | 天灵根 | 3.0× |

Elements sub-rolled per grade. Like the novel: most players start with a bad root — the game is
about overcoming it (pills/events/techniques mitigate, never replace).

### 6.3 `realmData.ts`
凡人 → 炼气 1–13 层 (13 auto layer-ups) → 筑基 (突破 base 40%) → 金丹 (25%) → 元婴 (15%) →
化神 (8%); 筑基+ each has 初期/中期/后期/大圆满 stages. Per-realm: exp curves, power base,
lifespan, failure penalties (death chance from 金丹 onward).

### 6.4 `techniques.ts` (~10 for MVP)
黄阶《长春功》/《引气诀》… 玄阶《青元剑诀》… 地阶《大衍诀》… 天阶《太玄经》(event-only).
Element-matched technique ×1.2 speed; combat arts (剑气/火球/土甲) add power.

### 6.5 `items.ts` (~40) & `recipes.ts` (~8)
Pills (回气散/聚气丹/筑基丹/凝金丹/疗伤丹/洗髓丹), weapons (铁剑→青锋剑→法器), armor,
talismans (遁地符/火弹符), materials (灵草/妖丹/精铁), manuals. 筑基丹 = the classic
mid-game chase item (+20% 筑基突破).

### 6.6 `eventTable.ts` (~40 events, per realm tier)
大凶: 妖兽袭击(combat)/走火入魔/坊市被劫; 小凶: 丢失灵石/旧伤复发; 平: 岁月静好/偶遇行商;
小吉: 拾获灵草/前辈指点(+exp); 大吉: 洞府残藏/顿悟(悟性 check → 大量exp)/奇人赠丹.
机缘≥8 rare pool: 上古传承 (grants 地阶功法). Each event: cold 天道 narration + optional
attribute-checked choices.

### 6.7 `npcs.ts` (6) / `quests.ts` / `endings.ts` / `names.ts`
NPCs: 坊市掌柜, 同门师兄, 神秘老者, 宗门长老, 魔道散修 (hostile track), 青梅故人.
Main story 3 chapters × 3 choices: 入宗门/散修/投效家族 → 筑基机缘之争 → 金丹因果.
Endings: 身死道消(combat) / 寿元耗尽 / 走火入魔 / 兵解(quest bad end) / 化神飞升(victory) each
with distinct 天道 closing lines. Names: pools for random cultivators/beasts/sects.

---

## 7. UI Design Direction — 玄墨鎏金 (Dark Ink & Gilded Jade)

**Mood:** an ancient scroll lit by a single oil lamp — dark, quiet, expensive. Restraint over
spectacle; gold is earned (used only for rare/critical moments), jade is the working color.

**Palette (CSS vars in `globals.css`):**
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0B0F0E` | app background (near-black ink green) |
| `--surface` | `#121815` | cards/panels |
| `--surface-2` | `#1A231F` | raised panels, hover |
| `--border` | `#2A3A32` | hairline borders |
| `--jade` | `#3E9B7A` | primary accent, progress, links |
| `--jade-bright` | `#5FD4A7` | success, active states |
| `--gold` | `#C9A227` | rare outcomes, realm titles, 大吉 |
| `--gold-bright` | `#E8C96A` | breakthrough flash, 天灵根 |
| `--vermilion` | `#B3402E` | danger, damage, 大凶, seals (印章) |
| `--ink-text` | `#D8D3C4` | body text (aged paper) |
| `--muted` | `#7C8A80` | secondary text |

**Typography:** headings/realm names — **Ma Shan Zheng** (brush calligraphy); body/narration —
**Noto Serif SC** (weights 400/600); numerals & dice — a tabular serif. Generous line-height
(1.9) for narration; narration column max-width ~65ch.

**Texture & ornament:** subtle paper-grain overlay (3% noise), ink-wash radial vignette on
edges, hairline double-border frames on panels (回纹-inspired corners via CSS), red seal-stamp
(印) motif for confirmations, vertical text accents for realm titles on desktop.

**Motion (Framer Motion, all subtle):** typewriter reveal for 天道 lines (fast, skippable on
click); D100 number-scramble → settle → color-coded flash; breakthrough sequence (dim → pulse →
reveal); panel Sheet slides; damage numbers drift up; ending screen slow ink-bleed in.
Respect `prefers-reduced-motion`.

**Layout principles:** the narrative log is the hero — everything else is chrome. Desktop:
fixed 3-zone as in §4; ≤768px: log full-screen, TopBar condenses, context tabs become a bottom
Sheet, CommandBar becomes a 2-row button grid. Touch targets ≥44px. Dark theme only (fits the
fiction; no theme toggle in MVP).

---

## 8. MVP Acceptance Checklist

- [ ] 开始游戏 → mandatory 4-step creation (origin, allocation, D100 spirit root, hidden roll)
- [ ] Turn loop: 修炼/探索/坊市/炼丹 advance time, per-turn D100 event fires
- [ ] 面板 shows all visible stats; 机缘 never appears anywhere in the UI
- [ ] 炼气 1→13 auto layers; 突破 gates 筑基/金丹/元婴/化神 with animated D100 vs target
- [ ] Combat: encounter → power/dice rounds → win (loot) / flee / death (ending)
- [ ] Inventory, 灵石, market buy/sell, at least 8 alchemy recipes working
- [ ] ≥40 events, 6 NPCs with favor, 3-chapter main story with 3-choice nodes
- [ ] 审计 lists every roll; hash-chain save integrity; 重开 with confirm
- [ ] Save/load via localStorage survives refresh; versioned schema
- [ ] Classical cold 天道 narration throughout; 玄墨鎏金 theme; mobile responsive
- [ ] `npm run build` (static export) and `npx vitest run` both pass
