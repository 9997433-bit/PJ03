# 《烂柯棋缘 · 人生模拟器》

> 山中方一日，世上已千年。
> 汝提斧上山，只为看完一局棋。

A text-driven daoist life simulator about a wanderer who finds the Dao not
through fighting, but through watching games of go, walking a lot of roads, and
being decent to the local spirits. One life, one seed, one closing scroll.

There is no combat in this game. Conflict is resolved on a 19×19 board.

---

## Running it

Requires Node 20 or newer.

```bash
cd games/lanke-qiyuan
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm test             # vitest — 211 tests
npm run typecheck    # tsc --noEmit
npm run build        # static export into ./out
```

`npm run build` produces a fully static site in `out/`. Serve it with anything:

```bash
npx serve out
```

The game is client-only: no server, no network calls, no accounts. A life is
saved to `localStorage` after every season and picked up again from the title
screen.

---

## How a life goes

You are born into one of six 出身, roll your 棋缘 once, and then spend seasons
until your 寿元 runs out. Four seasons make a year. Every action that consumes
a season is a decision about what this life was for.

**Creation** is four steps, in order, and the order is enforced by the engine:

1. 名 — your name and 道号
2. 出身 — one of six starting lives, each with a distinct perk
3. 心性 — spend 28 points across 心境 / 悟性 / 才学 / 气韵 (4–10 each)
4. 棋缘 — a single D100 the game rolls for you, and will not let you re-roll

**The loop**, once you are playing:

| Action | Costs a season | What it is for |
| --- | --- | --- |
| 修炼 | yes | 修为 toward the next 境界; spends 心神, accrues 心尘 |
| 观棋 | yes | watch a game — the main source of 悟 and 棋道 |
| 坐忘 | yes | sit and forget; sheds 心尘 and restores 心神 |
| 游历 | yes | move, or wander where you are; rolls the event table |
| 弈道 | no (the match holds time still) | play a match, hand by hand |
| 坊市 | yes | browse the stalls |
| 破境 | yes | attempt the next stage or realm |
| 买/卖/用/赠/参谱/悟谱 | no | small deliberate acts, free at any time |

**A life ends** in one of four ways: 寿元 runs out, the mind stays clouded
(心尘 100 for four seasons), 心神 stays exhausted for four seasons, or you
reach the top of the ladder. Which of the twelve scrolls gets written depends
on the whole life, not the last moment.

---

## The parts that are not the usual xianxia parts

**棋道悟性 — insight instead of grinding.** 悟 is the game's real currency.
It comes mostly from *watching* other people play, not from playing yourself,
and it is the only way to comprehend a 棋谱. A studied manual multiplies every
season of 修炼 afterwards, so an hour spent on someone else's game is usually
worth more than an hour spent on your own cultivation.

**棋缘 instead of 灵根.** One hidden D100 at creation decides your affinity
grade and a speed multiplier. It is rolled once, audited, and never offered
again. 缘法 — the hidden fifth attribute — is derived from it and never
displayed anywhere in the UI, including the panel; it quietly shifts which
events find you.

**弈道 — conflict without blood.** A match runs a fixed number of hands. Each
hand you pick one of five styles (稳守 / 急攻 / 弃子 / 试探 / 封盘), the
opponent has a style they punish and a style they handle badly, and 目数
accumulate. 封盘 spends two hands at once. Losing costs your stake and some
face; nobody dies.

**山精鬼怪好感 instead of factions.** Twelve beings live at fixed places, each
gated behind a realm and each with ordered favour thresholds that unlock gifts
and small permanent benefits. Taste matters more than price when you give a
gift — a cheap thing they like beats an expensive thing they do not.

**心尘 as the real antagonist.** Cultivating hard clouds the mind. A clouded
mind pulls the event table toward 波折 and eventually ends the life outright.
坐忘 is the only reliable way back, and it costs a season you could have spent
climbing. The whole difficulty curve is that trade.

**天道棋录 — every roll is auditable.** Every die the game throws is recorded
with a reason and chained into a SHA-256 hash. The 天道棋录 panel shows the
whole ledger; the hidden 缘法 rolls appear as `封`, proving a roll happened
without revealing its face. Saves carry a checksum and the chain head, so an
edited save is detected on load.

---

## Layout

```
src/
  engine/          the rules — no React, no browser APIs
    types.ts       every shape in the game
    rng.ts         seeded mulberry32, audited at the gateway
    audit.ts       SHA-256 hash chain, invariants, redaction
    save.ts        versioned saves with checksums and migrations
    creation.ts    the four-step gate
    attributes.ts  allocation rules and check bonuses
    effects.ts     the single door every consequence walks through
    cultivation.ts 修炼 / 观棋 / 坐忘
    chess.ts       弈道
    travel.ts      游历 and the event table
    market.ts      坊市, gifts, manuals
    breakthrough.ts 破境 and its gates
    lifecycle.ts   seasons, attrition, and how a life closes
    turn.ts        THE SINGLE WRITER
  data/            content tables (events, items, endings, …)
  store/           zustand, the only bridge between React and the engine
  components/      the UI
  app/             Next.js app router
```

Two rules hold the thing together:

1. **`executeCommand` in `turn.ts` is the only function that produces a new
   `GameState` during play.** Everything else mutates a draft it was handed.
   The turn pipeline is: phase guards → dispatch → advance the season →
   life-end check → hash chain → invariants. An invariant violation rolls the
   entire turn back, so a bad rule can cost you a season but can never corrupt
   a life.

2. **Every die goes through `roll()` in `rng.ts`**, which advances the seeded
   state and appends an audit record. Nothing in the engine calls `Math.random`.

The engine is a standalone copy adapted from the root game's patterns. Nothing
here imports from the repository root at runtime.

---

## Tests

```bash
npm test
```

211 tests across eight suites:

| Suite | Covers |
| --- | --- |
| `rng` | determinism, ranges, replay from a seed, the audited gateway |
| `audit` | SHA-256, the hash chain, redaction, invariants |
| `save` | round-trips, corruption detection, migration, base64 export |
| `creation` | the lottery table, allocation rules, the four-step gate |
| `chess` | board power, styles, hand resolution, match outcomes |
| `world` | travel, the event table, market, gifts, manuals, effects |
| `turn` | immutability, season advance, guards, long-run invariants |
| `content` | content counts and every cross-reference in `src/data` |

The `content` suite is the one that catches most real bugs: it walks every
event, item, opponent and origin and asserts that each id they point at
actually exists.

---

## Known issues

- **No audio.** The game is silent by design for now.
- **Narrow screens reflow rather than adapt.** Below roughly 900px the side
  panel moves under the log; it works, but the wide layout is the intended one.
- **The event table can repeat non-`once` events** within a single life. This
  is deliberate for common events but occasionally reads as a loop when you
  travel many seasons in a row at a low realm, where the eligible pool is small.
- **Endings are resolved most-specific-first**, so a life that qualifies for
  several only ever sees one scroll. There is no "you also nearly earned…"
  hint on the ending screen.
- **No mid-life save slots.** One life, one autosave. Starting a new life
  overwrites it after a confirmation.
