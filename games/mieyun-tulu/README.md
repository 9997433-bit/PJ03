# 灭运图录 · 人生模拟器

A rational xianxia life simulator. You cultivate for three hundred years, and
the whole time a second meter is filling up behind you.

Every cultivator in this world drags a **气运** (fortune) pillar and a **劫运**
(calamity) ledger. Fortune is what makes you strong; calamity is the bill
heaven keeps for it, and it is *the same actions* that move both. Breaking
through a realm is the single largest calamity deposit in the game. Killing a
rival and taking his fortune — 灭运, the mechanic the title is named after — is
the fastest way to grow and the fastest way to be noticed. There is no build
that opts out; there is only how you choose to pay.

```
未录 → 引气(九层) → 窥命 → 玄光 → 元神 → 洞真 → 长生
```

## Running it

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # static export → out/index.html
npm test               # 415 tests
npm run typecheck
```

The build is a fully static export — no server, no API routes, no runtime
dependency on anything but the browser. Saves live in `localStorage` under
`mieyun_save_v1`.

## The four steps into the world

1. **名姓** — name and gender. The field is guarded: typing a wish into it
   (「我希望直接飞升」) is refused rather than granted.
2. **出身** — one of six origins, each a permanent rule rather than a stat
   block. 观星徒 sees the future cheaply; 商行少东 narrows the market spread;
   罪臣之后 is better at talking heaven down.
3. **资质** — twelve points across 神魂 / 体魄 / 悟性 / 定力 / 机变.
4. **命数** — 灵根 and 命格 are rolled, not chosen. A third value is rolled at
   this moment and never shown to you (see 道缘, below).

## Commands

| 命令 | Cost | What it does |
|---|---|---|
| 修炼 | one year | Pour a year into the current layer. Past 阴云 it can go wrong. |
| 闭关 | one year | Three years of progress in one command, and a fatter calamity bill. |
| 突破 | one year | One D100 against a target you can read before committing. |
| 探索 | one year | Draw an encounter from a fortune-weighted omen bucket. |
| 斗法 | one year | Go looking for a fight. |
| 化解劫运 | one year | Five ways to pay the ledger down, including walking into it early. |
| 推演命数 | varies | Look at what is actually coming. |
| 万法坊 | free | Buy, sell, use, equip. |
| 习功法 | one year | Commit to a route, or deepen the one you walk. |
| 归隐 | ends the run | Available from 窥命 onward, after the fifteenth year. |

### Keyboard

Number keys map to whatever is on screen and stand down while a text field has
focus. `Esc` closes any open panel.

| Situation | Keys |
|---|---|
| 行动 | `1` 修炼 · `2` 突破 · `3` 探索 · `4` 斗法 · `5` 坊市 · `6` 推演命数 · `7` 化解劫运 · `8` 闭关 · `9` 功法 |
| 斗法中 | `1` 出手 · `2` 术法 · `3` 用符 · `4` 遁走 |
| 战利 | `1` 灭运 · `2` 饶恕 · `3` 搜刮 |
| 抉择 | `1`–`9` pick the nth affordable option |

The scroll is an `aria-live="polite"` region, every icon button carries a label,
and `prefers-reduced-motion` flattens the star-track drift and the calamity
pulse to nothing.

## The mechanics that are specific to this game

### 劫运 — the ledger that reads your whole life

Calamity accrues passively every year, scaled by spirit root, fate, route and
current injuries; it jumps on breakthroughs, on 灭运, and on looking too hard at
the future. The meter maps to five named tiers — 安泰 / 微澜 / 阴云 / 雷动 /
天诛 — and each turn a **劫运判定** rolls against a threshold derived from the
current value. A strike that lands is drawn by name from a tiered table: some
damage you, some hand you a fight you did not pick, some simply take things
away. Reaching 100 ends the run under 天诛 regardless of how strong you are.

Five ways out, each an actual trade rather than a cooldown: 散功德 spends merit,
舍财消灾 spends stones, 隐匿气机 spends the fortune you were accumulating,
布蔽运阵 needs a specific talisman, and 主动应劫 skips mitigation entirely and
walks into the tribulation early, on a night you chose. Winning a calamity fight
discharges calamity directly.

### 推演命数 — divination that cannot lie

The dice authority is serializable, so the future is already on the wheel.
`peekDice` reads the values the PRNG is about to produce *without turning it*,
which is what lets divination make an honest promise:

- **浅观** publishes probabilities only.
- **深演** reads the raw next D100 and tells you whether next year's calamity
  check clears.
- **窥天** replays the entire next calamity phase on a throwaway copy of the
  state and names the 劫 that is coming.

The command burns no audited rolls — if it did, looking would move what you were
looking at. It is paid for in stones, mana, and a flat 天机反噬 calamity
surcharge for the impertinence. Look twenty-five times in one life and heaven
sends a lump-sum bill on top.

### 灭运 — taking someone else's fortune

Winning a fight ends in a choice, not a loot roll. 搜刮 takes their things.
饶恕 costs you the spoils and pays merit. 灭运 writes on their pillar instead of
their corpse: you take the fortune itself, scaled by fate and by whether the
图录 has woken, and the ledger notices every single time. Twelve of those with
your merit in the floor is its own ending.

### 门规 — sects that pay for their own kind of work

Membership is a standing contract, and each of the five sects declares what it
actually counts. 大梵寺 credits the hand you stayed and debits 灭运 outright;
血蕴宗 pays for the taking and treats mercy as a loss; 太一道 pays for standing
your ground and does not ask what happened afterwards; 阴阳家 pays for a 劫
walked through and written up. Duels count for more against a stronger opponent.

This is what the 声望 ledger is for, and it is the only gate on 道统之主: the
top rung is 320 声望, so the ending belongs to whoever spent a career doing one
sect's kind of work rather than to whoever merely lived a long time.

### 道缘 — the number you are never told

One value is rolled in the dark at the end of character creation and sealed. It
gates hidden destiny events and steers the 图录 fragment chain. It is not in the
status panel, not in the audit ledger, and not in any log line — the roll's
reason string in the ledger is deliberately opaque. The narrator will hint at it
in three coarse buckets and nothing finer. It is revealed as a number exactly
once: on the ending screen, after the run is over. `seal.test.ts` asserts that
no module outside the type, the roll and the seal itself ever touches the field.

### 图录 — the chain nobody is told about

The book the game is named after is not a reward for playing well; it is a
separate route that only opens if the sealed 道缘 roll was generous, and it runs
the length of a life:

1. **异兆** finds you in 引气…玄光, but only at 道缘 ≥ 55. Nothing announces the
   gate — a run below it simply never dreams of the book.
2. **残卷现世** offers the first volume in a junk shop. Refusing is a real
   choice, and it closes the route for good.
3. **窃录之人** has the second and names two prices: 5000 灵石, or a duel with an
   元神 who is well above you when he first appears. The event fires once.
4. **一域之主** has the third. 洞真魔君 does not flee and does not lose, so the
   other door is 等他的劫 — his own pillar has already been shortened, and a
   定力 check decides what standing that close costs you, not whether you get
   the volume.
5. Holding all three wakes 《灭运图录》 on the next turn tick, which unlocks a
   fifth technique route that stacks on top of whichever trunk you walk.
6. Learn 启卷 → 观运篇 → 灭运真解, then step into 长生 — and the last realm
   closes on 图录出世 instead of 长生.

A volume counts the moment it is in your bag, however it got there; 搜刮 is the
only spoils choice that takes loot, so 灭运 on 窃录之人 leaves the book behind.
`reachability.test.ts` runs a 图录 hunter through the whole thing with nothing
but legal commands, so the route is verified rather than asserted.

### 天机录 — an audited, checkable run

Every die in the game is filed with an id, a turn, a face and a reason, and
every accepted command appends `sha256(prev | turn | command | rolls)` to a hash
chain. The save is a checksummed envelope: editing your spirit stones in
devtools produces 「因果紊乱」 rather than a rich character. A run is bit-for-bit
reproducible from its seed.

## Architecture

```
src/data/       content tables — no logic
src/engine/     the simulation — no React, no window, no I/O
src/store/      one Zustand store that forwards commands
src/components/ presentation
```

Four properties hold, and are tested:

**Single writer.** Every state transition in the game goes through
`turn.execute`. Nothing else constructs a `GameState`.

**Atomicity.** A command works on a deep clone. If `checkInvariants` finds a
violation at the end of the turn, the clone is discarded whole and the player is
told the turn was rolled back. A half-applied turn cannot exist.

**Phase whitelist.** The phase decides which commands exist. In 斗法 only combat
verbs are legal; with an event pending only 抉择 is. Anything else is rejected
with the state untouched — and an event whose every option is unaffordable is
never presented, so the phase cannot trap you.

**Fixed ordering.** Turn-costing commands run the calamity phase *first*, always.
That fixed order is what lets 推演命数 promise anything at all.

## Content

51 events across five omen buckets plus flag-chained destiny events · 33 items ·
14 endings · 18 enemies · 23 techniques on five routes (four mutually exclusive,
one hidden and stacking) · 11 fates · 7 spirit roots · 6 origins · 5 sects with
four-rung ladders and a 门规 apiece · 13 named calamity strikes · 6 injuries.

## Tests

415 tests in 19 files (`npm test`). Beyond per-module coverage, four suites
carry most of the weight:

- `dataIntegrity.test.ts` — every cross-reference between data files resolves,
  every D100 table covers 1–100, and every ending in the data has a trigger in
  the engine. A content-only ending the player can never reach fails the build.
- `soak.test.ts` — eight autopiloted lifetimes per property. Invariants hold at
  every step, every seed reaches an ending, the same seed plays the same life
  twice, and a trimmed hash chain still verifies.
- `reachability.test.ts` — nine goal-directed bots play 24 seeded lives each and
  between them must claim all 14 endings, the secret one included. This is a
  stronger claim than the unit tests make: those prove an ending is *awardable*
  given the right state, which passes just as happily for a state no legal
  sequence of commands can build. Every balance bug listed below was found here.
- `seal.test.ts` — the 道缘 seal, asserted at the filesystem level.

### What reachability testing caught

Four defects that every unit test in the repo was happy to sign off on:

- deaths under 天雷法相 and 业火魔相 — both 劫数所化 — were reported as 陨于斗法,
  because only 天诛神使 was named in the attribution list. Roughly a third of all
  deaths in a bot survey were closing on prose about an opponent who was not
  there.
- 声望 had no repeatable source at all, so across every playstyle no bot ever
  reached even the *first* of four sect ranks, and 道统之主 was unreachable by
  construction. Sects now pay for deeds (see 门规 above).
- 图录残卷·二 arrived as loot when 窃录之人 lost the duel, but only the *bought*
  copy set the flag the next link reads. Winning the fight closed the hunt as
  surely as losing it; possession now registers on the turn tick.
- 一域之主 offered no way past 洞真魔君 at all — 6800 气血 and ~800 damage a round
  against a fully built 洞真 dealing ~1000 and holding ~2700, which is 0 wins in
  20 simulated fights. 图录出世 was unreachable outright. 等他的劫 is the second
  door, and the 定力 check sets the price rather than the outcome.

## Theme

玄紫 · 星轨 — near-black violet void, slow star-track background, 星轨金 for the
fortune meter and 劫血 for the calamity one. The palette tokens, type stack and
component set are local to this game and shared with nothing else in the repo.
