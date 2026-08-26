# NAMING_R3 — Round 3 跨作命名整改记录(G8「术语零重合」)

> 执行:R3-F2(命名整改代理)。依据:`ARCHITECTURE.md` §10 命名冲突登记表 + 三份 `briefs/`。
> 原则:**只改显示名,不改字段/ID/存档 key**(改 key = 玩家灭档,见 ARCHITECTURE §6);数据与测试同步改,不留红。

## 一、已应用的更名

### G3 道君(games/dao-jun)

| 类别 | 旧 | 新 | 落点 |
|---|---|---|---|
| 境界七阶 | 炼气/筑基/金丹/元婴/化神/合道/道君 | **观纹/铭纹/织络/凝魂/御土/合道/道君** | `engine/types.ts` REALMS(引擎全程按下标引用,无别处硬编码) |
| 货币显示名 | 灵石 | **玄玉** | `engine/game.ts`(斗法战利文案)、`engine/content.ts`(事件/出身文案 ×3)、`components/DaoJunGame.tsx`(领地面板)、`README.md`;字段 `spiritStones` 不动 |

- 市场名「法会」与战斗六式(力破/周旋/布纹/摄神/吞丹/遁土):当前落盘引擎**尚无**市场系统与具名战术,无可改对象;R3 斗法/市场重做(dao-jun PLAN §75)落盘时须直接采用 §10 定名,禁止再引入「坊市/灵石/服丹」。

### G1 烂柯棋缘(games/lanke-qiyuan)

| 类别 | 旧 | 新 | 落点 |
|---|---|---|---|
| 叙述者 Speaker | `'天道'` | **`'弈者'`** | `engine/types.ts` Speaker 联合、`engine/prose.ts` say()、`components/game/NarrativeLog.tsx`(标记 弈/枰 区分弈者与枰声) |
| 叙述者相关文案 | 天道不容/天道已掷/天道不受愿/请天道落子 等 | 弈者不容/弈者已掷/弈者不受愿/请弈者落子 | `turn.ts`、`audit.ts`(SEALED_ROLL_NOTE、WISH_REJECTION)、`BreakthroughModal`、`ContextPanel`、`CreationWizard`、`page.tsx`、`README.md`、`eslint.config.mjs` 注释 |
| 市场名 | 坊市 | **墟市** | `commands.ts` 白名单(`墟市` 入口,泛称别名 `市集` 保留)、`economy.ts`、`ContextPanel`/`CommandBar` 标签、`README.md`;测试 `turn.test.ts`/`world.test.ts` 同步 |

- 裁定注:§10 原文「统一 `'弈者' | '棋录' | '汝'`」写于 R2 实现落盘前;现行引擎另有第四声部 `'弈'`(枰声,对弈中棋盘说话),与任何他作不撞名,予以保留。跨作冲突项(`'天道'`)已清零。
- 烂柯境界 `凡尘`/`通玄` 按裁定**保留**(撞名方灭运改名,见下)。

### G2 灭运图录(games/mieyun-tulu)

| 类别 | 旧 | 新 | 落点 |
|---|---|---|---|
| 境界 `mortal` 显示名 | 凡尘 | **未录**(契合「星盘未录」设定) | `data/realms.ts`、`engine/creation.ts`(初始 peakRealmLabel) |
| 境界 `tongxuan` 显示名 | 通玄 | **窥命** | `data/realms.ts`、`engine/endings.ts`(归隐门槛文案「未窥命者…」) |
| 境界名衍生词 | 通玄丹 / 通玄游侠 / 「百年可望通玄」 | 窥命丹 / 窥命游侠 / 「百年可望窥命」 | `data/items.ts`(id `tongxuandan` 不动)、`data/enemies.ts`、`data/spiritRoots.ts` |
| 货币显示名 | 灵石 | **玄晶** | 引擎/组件/数据/测试共 22 文件全量替换;字段 `stones`/`spiritStones`/`costStones` 等不动 |
| 市场名 | 坊市(含指令 `坊市买`/`坊市卖`) | **万法坊**(指令 `万法坊买`/`万法坊卖`) | `engine/turn.ts` Command 联合+白名单+审计描述、`components/panels.tsx`/`GameScreen.tsx`、`engine/market.ts`、`data/`(events/origins/items/endings)、`README.md` |
| 同步测试 | — | — | breakthrough/creation/cultivation/divination/endings/events/market/progression/rng/reachability/save/turn/calamity 共 13 个测试文件的字符串断言同步更名 |

- 指令 kind 是瞬态输入,不入存档;审计掷理由(如 `战利·玄晶`)只影响新记录,旧存档校验和按整状态重算,不受更名影响。

## 二、复核结论(整改后 grep)

- `games/lanke-qiyuan`:`天道`/`坊市` 源码残留 **0**(仅 PLAN.md 裁定条目引用旧名作说明)。
- `games/mieyun-tulu`:`凡尘`/`通玄`/`灵石`/`坊市` 源码残留 **0**(仅 PLAN.md 裁定条目)。
- `games/dao-jun`:`炼气/筑基/金丹/元婴/化神`/`灵石` 源码残留 **0**(仅 PLAN.md 裁定条目)。
- 根游戏(`src/`)不动:天道/坊市/灵石/炼气…化神 为根游戏原生术语,四作现互不重合。

## 三、未尽事项 / 对后续代理的提醒

1. **R3 并行的 dao-jun 斗法/市场重做**(分支 `cursor/daojun-r3-sota-a9cb` 在途)曾出现引入 `坊市`/`灵石` 的草稿(market.ts/combat.ts 等未落盘文件):合入前必须按本表改为 **法会 / 玄玉**,战术名用 力破/周旋/布纹/摄神/吞丹/遁土。
2. 建议各作 dataIntegrity 测试加「禁用他作术语」回归断言(ARCHITECTURE §10 已有此建议,本轮未添加以保持改动面最小)。
3. 共享工作树注意:本轮曾因并发 `git reset` 丢失未提交改动;整改在隔离 worktree 完成并逐游戏即时 push。
