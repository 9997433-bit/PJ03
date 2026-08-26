# G3《道君》Round 2 SOTA 审计报告

> 审计人:R2-F2(claude-fable-5-thinking-xhigh) · 2026-08-26
> 对象:`games/dao-jun/` @ 修复后 HEAD(含 R2-S1 的 polish 提交 7765192/836f17d 与本次审计快修)
> 方法:逐文件代码走查 + 实机验证(lint/typecheck/vitest/build/smoke/e2e)+ **机器人全程通关模拟**(8 策略 × 40 种子 = 320 局完整对局:创角状态机 → 回合循环 → 结局)

## 总分

| | 修复前 | 修复后(本次提交) |
|---|---|---|
| 通过 | 4 | **5**(G2 G7 G10 G11 → +G0) |
| 部分 | 5 | 5(G1 G3 G5 G6 G8) |
| 失败 | 3 | **2**(G4 G9) |
| **加权得分** | 5.5 / 12 | **7.5 / 12** |

实测(修复后全绿):`npm run lint` ✅ · `tsc --noEmit`(strict + noUncheckedIndexedAccess)✅ · vitest **101/101** ✅ · `next build` 静态导出 ✅ · smoke 5/5 ✅ · probe-e2e 5/5 ✅ · 根游戏回归 164/164 ✅

---

## 逐项判定

### G0 构建与类型 — ✅ 通过(本次修复)
- build/静态导出/独立 package.json ✅(原有)
- ❌→✅ tsconfig 缺 `noUncheckedIndexedAccess` — **已补**,typecheck 零报错
- ❌→✅ 无 lint 脚本、无 eslint 配置、无 Math.random 禁令 — **已补** `eslint.config.mjs`(no-restricted-properties 禁 Math.random,豁免仅 `engine/rng.ts`;实测违规文件确实报错)+ `lint` 脚本 + devDeps(eslint / typescript-eslint)

### G1 测试 — ⚠️ 部分
- ✅ 101 项全绿(≥40 门槛),含 rng 确定性、创角门禁(R2-S1 新增 9 项)、独有机制(daoPattern/soulPower/territory 共 40+ 项)、回合 pending 锁、内容完整性(id 唯一、悬空引用)
- ✅ 本次新增:软锁回归、结局优先级、**同种子逐字节回放**测试
- ❌ 缺:审计哈希链测试(系统不存在,见 G9)、D100 桶覆盖测试(系统不存在,见 G5)、store 集成冒烟(无 store,UI 直接 useState,见 fix#2)
- ✅ 根游戏 164/164 保持全绿

### G2 静态导出可玩 — ✅ 通过
- ✅ `out/` 根路径 serve 即玩;导出物扫描零外网请求(仅 license 注释串);无 CDN/analytics/API
- ✅ 存档键 `daojun_save_v1` 全仓唯一(root=`mcls_save_v1`、lanke=`lkqy_save_v1`、mieyun=`mieyun_save_v1`);刷新续玩正常(localStorage 自动存卷)
- ✅ **软锁已修**(原:qi<8 且神魂<6 时五action全灰、回合永不推进、资源永不恢复 → 永久死局;机器人在 brawler 策略 2/8 种子实测复现。现:悟道降级为「静坐调息」保底回合)
- ⚠️ 备注:SaveEnvelope/magic 校验仍缺(计入 G9)

### G3 创角流程 — ⚠️ 部分
- ✅ 四步(留名→问身→择途→立誓)且引擎侧步进门禁(`creation.ts` 状态机:乱序 select 被拒、未答不可 advance,9 项测试;R2-S1 本轮补齐)
- ✅ 完成前无法进入游玩(options 门返回前 UI 无 state)
- ❌ 无「落子无悔」种子化抽取(无 D100 道缘抽取,无审计)
- ❌ 无暗掷隐藏属性(无机缘/命数等价物)
- ❌ 出身仅 **4** 种(<6),且 perk 硬编码在 createGame 而非机读数据
- ❌ 无属性点分配步骤 ⇒ 无点数守恒测试
- ❌ 创角中途刷新不可恢复(CreationState 未持久化,只存完成后的 GameState)

### G4 战斗与经济 — ❌ 失败(最大结构缺口)
- ❌ 斗法是**单掷即出**(1 次 d38 vs 敌方值),非回合制战斗;无 ≥3 战术、无战斗相位锁、无胜/败/逃三出口、无「劫财/夺命」两级败北
- ❌ 无市场:灵石只能捡不能花(物品全靠事件/初始),无买/卖价差、无按境界分层商品
- ❌ 无消耗性生产系统(无炼丹/刻纹产出链;凝纹消耗感悟但产物非消耗品)
- ⚠️ 货币不为负靠 clamp 保证,但无回合末不变量断言 + 回滚(计 G9)

### G5 事件系统 — ⚠️ 部分
- ✅ **40** 个事件(R2-S1 补至门槛),id 唯一,五 action 桶均有覆盖,悬空物品引用有测试
- ✅ 100% 事件带双抉择(≥30% 门槛)
- ❌ 抉择**无检定**:两个选项都必然成功(无 D20+属性 vs DC 的成败双效果)
- ❌ 无 D100+气运五桶(大凶…大吉)分桶;抽取为 action 过滤池单次均匀掷(有种子,无两段式、无审计记录)
- ❌ 零 flag 机制:无 `requiresFlag`/`once`/链式彩蛋(仅 seenEvents 最近 24 条去重窗口,循环后可重复)
- ❌ 无隐藏属性门(minJiYuan 等价物)
- ⚠️ minRealm/paths 过滤存在但当前 40 事件无一使用 minRealm ⇒ 全程事件池不随境界演进

### G6 结局 — ⚠️ 部分(比根游戏强,但实际可达性严重偏斜)
- ✅ 12 个结局**全部**在 `evaluateEnding` 引擎侧接线(无 data-only 结局,吸取根游戏 16 定义/5 接线教训)
- ✅ 构成:4 登顶(四道途道君)+ 6 机制歧路(山河共主/万纹天书/魂灯不灭/富甲仙域/万家生祠/云外散人)+ 2 陨落
- ❌ **实测可达性:320 局机器人对局(含专门冲击道君的智能策略)只触达 4/12**:patternSage / magnate / benevolent / death。里程碑结局阈值过低且逐回合自动触发 —— 凝纹 12 道、灵石 1200、因果 100+声望 80 均在冲击化神/合道途中被动越线,**四个登顶结局与 conqueror/soulAscendant/wanderer/oldAge 在真实游玩中被系统性遮蔽**
- ❌ 陨落变体仅 2 种(健康/魂稳合并为一 death + oldAge);突破失败 `Math.max(1, …)` 保底 1 血 ⇒ 永不劫殒,无战死专属、无机制专属死法(<4 门槛)
- ✅ 本次快修:同回合优先级改为 天品登顶 > 里程碑(原顺序连同回合达成都会被 conqueror 抢占)
- ⚠️ 结局屏有 4 项生涯统计但无总掷骰/击杀/失败突破计数;数据完整性测试有 ≥10 断言但无逐结局可达性静态证明

### G7 无障碍 — ✅ 通过
- ✅ 命卷纪事 `aria-live="polite"`;toast `role="status"`;Meter 带 aria-label;选项卡 `aria-pressed`;步进器 `aria-current`(均 R2-S1 本轮补齐)
- ✅ 全键盘:1–5 行动、事件 1/2 抉择(输入框聚焦时让位),README 有记载
- ✅ `:focus-visible` 焦点环;`prefers-reduced-motion` 全局降级
- ⚠️ 小项:结局对话框缺 `aria-labelledby`;`#61778b`/`#405568` 等中间灰对比度贴线,建议 R3 复核

### G8 主题唯一性 — ⚠️ 部分
- ✅ 雷霆蓝调色板(--ink/--cyan 深蓝系 + SVG 雷纹背景)、疆域地图版式与其余三作 3 秒可辨
- ✅ 签名机制独有:道纹刻画(感悟→凝纹→调和)× 神魂损耗 × **疆域占领/粮草/掌控**(其余三作均无领地经营)
- ✅ 叙事文案原创,未见根游戏段落复制
- ❌ **术语撞车**:境界名 `炼气/筑基/金丹/元婴/化神` 与根游戏完全同名,货币 `灵石` 与根游戏、mieyun 三方共用 —— 违反「术语零重合」(需跨组协调,mieyun 同样违规)

### G9 确定性与防作弊 — ❌ 失败(第二大结构缺口)
- ✅ mulberry32 种子入存档、全引擎无 Math.random(现有 lint 禁令锁死)、单一写入者(performAction/chooseEvent 复制后变更)
- ✅ 同种子同指令序列逐字节一致(实测 + 本次新增回归测试)
- ❌ 无逐掷审计(理由+骰前状态)、无审计查询指令
- ❌ 无回合哈希链、无 SaveEnvelope(magic/校验和),**localStorage 手改任意数值可直接生效**(载入仅查 version 与两个字段存在性,无「因果紊乱」拒载)
- ❌ 无回合末不变量断言与整回合回滚(靠散落 clamp)
- ❌ 无命令白名单/许愿拒绝层(纯按钮 UI 天然受限,但引擎层无防御)

### G10 工程卫生 — ✅ 通过
- ✅ engine/ 零 React、零浏览器 API(localStorage 仅在组件层)
- ✅ README 完整(玩法/快捷键/构建/probe);games/* 互不 import;单一事实源(ENDINGS/EVENTS 各一处)
- ⚠️ 小项:`harmonize`/`shakeSoul` 引擎未使用(仅测试引用);`chooseEvent` 的 `choice(turn)` UI 层 index as-cast 可收紧

### G11 发布 — ✅ 通过
- ✅ `out/` 自包含可 zip;probe-build.sh + smoke-test.mjs + probe-e2e.mjs 三层验证;根 scripts/package-all.sh 已接 daojun
- ✅ 根游戏回归 164/164 全绿

---

## 本次审计已应用的快修(4 项,均 <20 行)

| # | 门 | 修复 | 文件 |
|---|---|------|------|
| 1 | G0 | `noUncheckedIndexedAccess: true`(typecheck 零报错) | tsconfig.json |
| 2 | G0 | eslint.config.mjs(Math.random 禁令,豁免 rng.ts)+ lint 脚本 + devDeps | eslint.config.mjs, package.json |
| 3 | G2 | 软锁修复:悟道在神魂<6 时降级为「静坐调息」保底回合(资源恢复路径永不断) | engine/game.ts |
| 4 | G6 | 结局同回合优先级:天品登顶 > 里程碑歧路 | engine/game.ts |

另新增 3 项回归测试(软锁/优先级/逐字节回放),98 → 101。

## Round 3 修复清单(按优先级)

1. **G6 结局遮蔽(最高)**:里程碑结局(patternSage/magnate/benevolent/conqueror)改为「玩家确认制」(触发时弹抉择:就此收官 or 继续问道)或大幅提高阈值;补机器人通关测试断言 12/12 结局可达(本报告的 8 策略 bot 框架可直接移植);突破失败改为可劫殒 + 新增 ≥2 种机制专属死法(魂崩/疆域倾覆)
2. **G9 防作弊全链**:SaveEnvelope(magic=`daojun_save_v1`+校验和+载入拒篡改「道基紊乱」)、逐掷审计日志、回合哈希链、回合末不变量断言+回滚 —— 对照根游戏 save.ts/audit.ts 移植
3. **G4 战斗+经济**:斗法改回合制(≥3 战术换皮:破纹强攻/游身缠斗/敛息遁空),胜/败/逃三出口 + 劫财/夺命两级;新增坊市(买卖价差、按境界解锁)与刻纹生产链(道材→符纹消耗品)
4. **G3 创角深度**:出身扩至 ≥6(机读 perk 表)、属性点分配步骤+守恒测试、种子化道缘 D100 抽取入审计、暗掷隐藏「命数」、CreationState 持久化支持中途刷新
5. **G5 事件深度**:D100+气运五桶两段式审计抽取、≥30% 事件加 D20+属性 vs DC 成败双效果、≥5 条 flag 链(requiresFlag/once)、隐藏属性门、按境界启用 minRealm 分层
6. (协调项)**G8 术语**:境界名/货币名与根游戏及 mieyun 撞车,需跨组统一换皮(建议:道君用 感气/铭纹/引雷/镇岳/合道/道君 + 玄晶)

## 机器人可达性数据(320 局,修复后)

```json
{ "reached": { "patternSage": 78, "magnate": 57, "benevolent": 122, "death": 63 },
  "missing": ["oldAge", "swordSupreme", "spellSupreme", "bodySupreme", "soulSupreme", "conqueror", "soulAscendant", "wanderer"] }
```
