# REUSE_MAP — 根游戏 → 三款新游戏 逐文件复用地图

> 作者:R1-F2(SOTA Auditor)。根游戏体量:引擎 24 文件 ≈ 4.7k 行,数据 16 文件 ≈ 3.9k 行,组件 21 个 + shadcn 15 个,测试 8 文件 157 项。
>
> 图例:♻️ **原样复用**(仅改常量/命名) · 🔧 **改造复用**(保留骨架,替换领域内容) · 🎨 **换皮重写**(仅复用模式,内容全新)

## 复用策略结论(给 F1 架构代理的建议)

**Round 1–2 采用「拷贝-适配」而非抽共享包。** 理由:
1. 三款游戏由三个并行子代理开发,共享 `packages/engine-core/` 会造成跨代理写冲突与接口协商成本;
2. 根游戏必须保持 157 测试全绿不动,抽包必然触碰根 src/,回归风险不对称;
3. ♻️ 级文件(rng/save/audit 核心/prose 助手)本身几乎零耦合,拷贝成本 ≈ 一次 `cp` + 改 3 个常量。
若 Round 3 有余量,再评估抽包(一次性迁移四作,G10 约束)。

每款新游戏推荐目录 = 根结构镜像:`games/<id>/src/{engine,data,store,components,app,lib}`,配置五件套(`next.config.mjs`/`tsconfig.json`/`eslint.config.mjs`/`vitest.config.ts`/`postcss.config.mjs`)直接拷贝。

---

## 1. src/engine/(核心判定:约 60% 可直接搬运)

| 文件 | 行数 | 判定 | 新游戏改动点 |
|---|---|---|---|
| `rng.ts` | 259 | ♻️ | 完全通用(mulberry32 + xmur3 + 审计网关 + AuditedRoll 装箱数)。仅改:种子前缀 `道-`、`SEALED_REASON_MARKER='暗掷'` 可按主题换词(棋局→`覆枰`、灭运→`匿运`、道君→`藏机`)。**逐字节拷贝,连测试一起搬**(rng.test.ts 23 项全通用) |
| `audit.ts` | 361 | ♻️/🔧 | 通用:`sha256Hex`、`chainAuditHash`、`verifyChain`、`fnv1a64`、`formatAuditRecord`、TZ 编号。需换:`GENESIS_HASH` 种子串(每作独有,防跨游戏存档互换)、`WISH_PATTERNS` 增删主题词、`checkInvariants`(境界序表/属性上界按各作领域改)、`ANTI_CHEAT_LAYERS` 九层文案换叙述者口吻 |
| `save.ts` | 276 | ♻️ | 信封+校验和+迁移+Base64 导入导出+StorageAdapter 全通用。仅改 3 常量:`SAVE_KEY`(**必须唯一**,G2)、`SAVE_MAGIC`(MCLS→LKQY/MYTL/DJUN)、损坏文案。测试模式照搬 |
| `types.ts` | 702 | 🔧 | 拆两半看:**核心契约**(DiceRoll/LogEntry/GameState 骨架/EventEffect/PendingEvent/CombatState/Notice/TurnResult/常量 LOG_CAP·ROLL_CAP)照搬;**领域模型**(Attributes 五维/SpiritRoot/RealmId/Origin perk 枚举)按 briefs 重定义。保持字段命名习惯一致(`flags`、`stats`、`nextRollId`),UI 层可平移 |
| `turn.ts` | 321 | 🔧 | **最高价值骨架**:clone → 相位守卫(ended/creation/pending/combat)→ dispatch → TIME_COMMANDS 推进时间 → 回合事件掷 → 任务扫描 → 哈希链 → 不变量违规整体回滚。管线逐行保留;换:dispatch 表、TIME/ALLOWED 集合、面板/背包/审计三个 free-look 视图文案 |
| `commands.ts` | 148 | 🔧 | 解析器骨架(whitelist→Command、裸数字→事件选择、`commandKey` 入链)保留;token 表按各作指令换(修炼→对弈/推演/刻纹) |
| `events.ts` | 153 | ♻️ | 分桶(5 桶阈值)+ 气运偏移 + 加权抽取 + requiresFlag/once/minJiYuan 门 + choice 检定,全部数据驱动,**原样搬**;仅桶名与文案换皮。`bucketOf` 阈值若各作调整,同步改 dataIntegrity 测试 |
| `effects.ts` | 100 | 🔧 | EventEffect 应用器;按各作效果词汇增删字段(如 lanke 加 `karma`、mieyun 加 `fateValue`、daojun 加 `soulExp`) |
| `creation.ts` | 350 | 🔧 | 4 步状态机门禁(`creationStep` 推进 + 非法跳步拒绝)+ 种子化抽取 + 暗掷,骨架保留;步骤内容(出身表/属性集/抽取表)按 briefs 换 |
| `cultivation.ts` | 215 | 🔧 | exp 增长 + `settleLevelUps` 自动小升级模式保留;速率公式因子(灵根倍率→棋悟/运数/道纹共鸣)换 |
| `breakthrough.ts` | 468 | 🔧 | D100 对赌 + 心魔检定 + 失败惩罚(掉修为/受伤/陨落)+ 保底 pity 计数器模式极佳,保留;境界梯子与文案换 |
| `realms.ts` | 293 | 🎨 | 境界序数学模式可参考;梯子本身(炼气 13 层→各作体系)全新 |
| `combat.ts` | 334 | 🔧 | 回合制 + 战术分支(强攻/游斗/设伏各带 buff 态:opening/trapArmed/fleeFailures)+ 胜负逃三出口 + 审计掷,骨架保留;战术命名/公式系数/败北处置换皮 |
| `economy.ts` | 92 | ♻️ | 买卖价差 + 境界分层货架,数据驱动,原样搬 |
| `alchemy.ts` | 106 | 🔧 | 配方消耗+成功率+大成功模式 → lanke 可弃用、mieyun 改「推演功法」、daojun 改「刻纹」——同一骨架三种皮 |
| `inventory.ts` | 169 | ♻️ | 堆叠/使用/装备,通用 |
| `exploration.ts` | 98 | ♻️ | D100 发现表(桶必须覆盖 1..100,dataIntegrity 锁死),通用 |
| `npc.ts` | 60 | ♻️ | 好感 + 阈值解锁,通用 |
| `quests.ts` | 139 | ♻️ | 目标扫描(reachRealm/killCount/obtainItem/favor)+ 三选一主线节点,通用 |
| `lifecycle.ts` | 295 | 🔧⚠️ | 年岁/寿元/结局触发模式保留。**勿照抄双轨死代码**:`lifecycle.advanceTime`/`rest` 与 `turn.ts` 内部实现重复且未被调用;`ENDING_DEFS`(5 结局)与 `data/endings.ts`(16 结局)双源、后者未接线。新游戏:结局单一事实源放 data,引擎 `finishGame(id)` 查 data 表,≥10 结局全部接线(G6) |
| `narrative.ts` / `prose.ts` | 301 | 🔧 | `say/sys/battle` 日志助手 + `pick`(FNV 确定性选池,不耗审计骰——聪明设计,必搬)+ `gainExp`/`ensureStats` 通用;台词池 100% 重写 |
| `index.ts` | 21 | ♻️ | barrel,照搬改导出 |

## 2. src/data/(schema 全复用,内容 0% 复用)

| 文件 | 判定 | 说明 |
|---|---|---|
| 全部 16 文件 | 🎨 | 接口(GameEvent/ItemDef/Enemy/Quest/LocationDef/EndingDef…)经 types.ts 复用;内容按 briefs 全新创作。数量门槛见 SOTA_CRITERIA G5/G6 计分表 |
| `__tests__/dataIntegrity.test.ts` | ♻️ | **最高杠杆资产**:id 交叉引用无悬空、D100 表覆盖 1..100、桶×境界覆盖、结局数量断言。骨架照搬,断言目标改为各作数据。新增一条根游戏没有的断言:**每个结局 id 被引擎或事件效果引用(可达性)** |

## 3. src/store/

| 文件 | 判定 | 说明 |
|---|---|---|
| `gameStore.ts` | 🔧 | 整体架构照搬:zustand persist 包 checksummedStorage(load 验校验和,损坏置 corruptSave)、`runTurn`(parse→executeCommand→emitToasts→fx)、创角四动作、重开确认拦截。改:SAVE_KEY、toast 文案、ContextTab 枚举、BreakthroughFx 换各作高光时刻(对弈/渡劫/斗法) |

## 4. src/components/

| 文件 | 判定 | 说明 |
|---|---|---|
| `ui/*`(15 个 shadcn 原语) | ♻️ | 逐字节拷贝 |
| `game/GameLayout.tsx` | ♻️ | 三区布局 + lg 以下 Sheet 抽屉 + aria-label,通用;抽屉标签文字换 |
| `game/NarrativeLog.tsx` + `Typewriter.tsx` | ♻️ | aria-live + 打字机可跳过 + tone 着色,通用;tone→颜色映射跟主题 tokens 走 |
| `game/CommandBar.tsx` | 🔧 | 按钮群 + 输入解析 + 快捷键,骨架通用;指令集换 |
| `game/TopBar.tsx` / `CharacterPanel*.tsx` | 🔧 | 状态条/命盘布局通用;字段随各作属性集重排 |
| `game/DiceRoll.tsx` | ♻️ | 骰面动画,通用 |
| `game/BreakthroughModal.tsx` | 🔧 | D100 张力动画骨架保留,视觉换皮(落子/渡劫雷云/道纹亮起) |
| `game/CombatView.tsx` | 🔧 | 战术按钮 + 回合日志,骨架通用 |
| `game/MarketView.tsx` / `InventoryView.tsx` / `QuestView.tsx` / `AuditView.tsx` | ♻️ | 数据驱动列表,近乎原样 |
| `game/AlchemyView.tsx` | 🔧 | 变身推演面板/刻纹台(mieyun/daojun);lanke 若无对应系统则弃 |
| `game/EndingScreen.tsx` | 🔧 | 生涯统计 + 盖棺文案布局保留,视觉换皮 |
| `game/ConfirmDialog.tsx` / `TutorialHints.tsx` / `format.ts` / `Ornaments.tsx` | ♻️/🎨 | 前三通用;Ornaments(印章/云纹)每作重绘 |
| `creation/*`(向导 4 步) | 🔧 | 步进向导骨架保留;各步内容随创角设计换 |

## 5. src/app/ 与配置

| 文件 | 判定 | 说明 |
|---|---|---|
| `app/page.tsx`(标题页)/ `app/game/page.tsx` | 🔧 | 标题页确认流 + 同屏相位切换(creation/playing/combat/ended)+ 损坏存档屏 + 1–9 快捷键,骨架照搬 |
| `app/globals.css` | 🎨 | **结构照搬**(@theme tokens → shadcn 语义映射 → 动画 keyframes 三段式),**取值全换**(见各 brief 的调色板) |
| `lib/fonts.ts` / `lib/sfx.ts` / `lib/utils.ts` | 🔧/♻️ | next/font 自托管模式照搬,字体按主题换;utils 原样 |
| `next.config.mjs` / `postcss` / `tsconfig` / `vitest.config.ts` / `eslint.config.mjs` | ♻️ | 五件套照搬;eslint 的 Math.random 禁令 files 路径改为本包路径 |

## 6. 测试资产复用

| 测试 | 判定 | 说明 |
|---|---|---|
| `rng.test.ts`(23) | ♻️ | 原样搬 |
| `audit.test.ts`(35) | 🔧 | 哈希链/不变量/许愿部分通用,领域断言改 |
| `creation/cultivation/breakthrough/turn.test.ts`(63) | 🔧 | 结构照搬,数值表随各作重算 |
| `dataIntegrity.test.ts`(17) | ♻️ | 见上,+ 结局可达性断言 |
| `integration.smoke.test.ts`(1) | ♻️ | 存档 round-trip 冒烟 |

→ 照此搬运,每款新游戏起步即有 ~60 项测试骨架,G1 的 40 项门槛可稳过。

---

## 根游戏自身待修清单(不阻塞新游戏;R2/R3 若有余量)

1. **结局接线断层**(G6 ⚠️):16 定义/5 可达,`data/endings.ts` 仅测试引用。
2. 死代码双轨:`lifecycle.advanceTime`/`lifecycle.rest` 未被调用,与 `turn.ts` 内实现漂移。
3. `prefers-reduced-motion` 未处理(G7)。
4. 事件表 67 中带 `minJiYuan` 天命门与旗标链的深度可再加,但已达标。
