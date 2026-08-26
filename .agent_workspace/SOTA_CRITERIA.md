# SOTA 验收标准 — 四款人生模拟器统一检查单

> 作者:R1-F2(SOTA Auditor,claude-fable-5-thinking-xhigh)
> 适用对象:根目录《凡人修仙传》(基线) + `games/lanke-qiyuan/` + `games/mieyun-tulu/` + `games/dao-jun/`
> 基线实测(2026-08-26):根游戏 `npm run build` ✅ 静态导出 5 页 · `npx vitest run` ✅ 157/157 · `tsc --noEmit` strict。

每款游戏必须**逐项**通过下列 12 组门槛(G0–G11)。「验证命令」在该游戏目录内执行。

---

## G0 · 构建与类型 (Build)

- [ ] `npm run build` 退出码 0,产出 `out/`(`output: 'export'`,`images.unoptimized`,无 API 路由 / Server Actions / 动态段)
- [ ] `npm run typecheck`(`tsc --noEmit`)退出码 0,tsconfig 保持 `strict` + `noUncheckedIndexedAccess`(与根游戏一致)
- [ ] `npm run lint` 退出码 0,且**必须**携带根游戏的 Math.random 禁令(`eslint.config.mjs` 中 `no-restricted-properties`,豁免仅限 `engine/rng.ts`)
- [ ] 独立 `package.json`(games/ 下每款自成一体,可单独 `npm install && npm run build`)

## G1 · 测试数量与覆盖 (Tests)

- [ ] `npx vitest run` 全绿,**每款 ≥ 40 项测试**(根基线 157 项,8 文件)
- [ ] 必测清单(对照根游戏测试布局):
  - rng 确定性:同种子同序列、骰面范围、审计封印(对照 `rng.test.ts`,23 项)
  - 创角门:步骤顺序不可跳、属性点数守恒、抽取表全覆盖(对照 `creation.test.ts`)
  - 推进数学:修为/升层/突破成功率边界(对照 `cultivation.test.ts` + `breakthrough.test.ts`)
  - 审计:哈希链、不变量回滚、许愿拒绝(对照 `audit.test.ts`,35 项)
  - 回合解析器:时间推进、pending 事件锁、战斗相位锁(对照 `turn.test.ts`)
  - **数据完整性**:事件表桶覆盖、物品/敌人/NPC id 交叉引用无悬空、D100 表覆盖 1..100(对照 `dataIntegrity.test.ts` —— 这是防内容腐坏的最高杠杆测试,必须移植)
  - **本作独有机制**至少 5 项专项测试(棋盘/劫运/道纹等,见 briefs)
  - store 集成冒烟 ≥ 1 项
- [ ] 根游戏 157 项在整个开发过程中**保持全绿**(新游戏不得触碰根 src/)

## G2 · 静态导出可玩 (Static Export)

- [ ] `python3 -m http.server -d out 8000` 后,浏览器打开即完整可玩(创角→游玩→结局全程)
- [ ] 零外网请求:字体经 next/font 自托管;无 CDN、无 analytics、无 API 调用
- [ ] 控制台无未捕获错误;刷新页面存档续玩正常
- [ ] **存档键唯一**:四款游戏可能同源部署(同一 localhost 端口/域名下换路径),`localStorage` 按 origin 隔离而非按路径 —— 根游戏用 `mcls_save_v1`,新游戏必须各用独有前缀(建议 `lanke_save_v1` / `mieyun_save_v1` / `daojun_save_v1`),SaveEnvelope 的 `magic` 常量同步改名
- [ ] 若发布方案为一域多路径,需设置各自 `basePath`;若按「每游戏一 zip、独立 serve」发布(PROGRESS 既定目标),根路径 serve 即可,zip 内附一行启动说明

## G3 · 创角流程 (Creation Flow)

- [ ] 多步创角(≥ 3 步,根游戏为 4 步:立名→出身→属性→抽取+暗掷),**引擎侧步进门禁**(`creationStep` 状态机,乱序调用被拒),不是纯 UI 约束
- [ ] 至少一次「落子无悔」的种子化抽取(对应灵根 D100),抽取入审计
- [ ] 至少一个**隐藏属性**经暗掷产生,永不进入任何 UI 字符串(对照机缘/暗掷封印;各作换皮:因果盘/命数/道缘)
- [ ] 出身 ≥ 6 种,各带机读 perk;属性分配点数守恒有测试
- [ ] 创角中途刷新可恢复;完成前无法进入 playing 相位

## G4 · 战斗与经济 (Combat / Economy)

- [ ] 回合制战斗:≥ 3 种有区分度的战术(根游戏 6 种:强攻/游斗/设伏/术法/服药/遁走),胜/败/逃三出口,败北分「劫财」与「夺命」两级
- [ ] 战斗内相位锁:非战斗指令被拒(白名单),战利品/灵石掉落走审计骰
- [ ] 经济闭环:买/卖有价差(卖价 < 买价),≥ 1 个消耗性生产系统(炼丹/推演/刻纹),货币不变量(不为负,违者回合回滚)
- [ ] 市场按境界分层解锁商品
- [ ] 每款的战术命名与公式**必须换皮换感**(见 G9 与 briefs),不得照抄根游戏文案

## G5 · 事件系统 (Events, ≥ 40)

- [ ] **≥ 40 个**不同事件(根基线 67);D100+气运偏移 → 五桶(大凶/小凶/平/小吉/大吉)或等价换皮分桶
- [ ] 每个进度层级(境界段)在每个桶内至少 1 个可命中事件(避免「静默季」概率过高);用数据完整性测试锁死
- [ ] ≥ 30% 事件带玩家抉择(检定 D20+属性 vs DC,成功/失败双效果)
- [ ] ≥ 5 个 flag 链式事件(彩蛋链,对照根游戏神秘小瓶 2% 链)
- [ ] 隐藏属性门(`minJiYuan` 等价物)与 `once` 去重、`requiresFlag` 机制齐备
- [ ] 事件权重抽取走审计骰(两次掷:定桶 + 桶内抽取)

## G6 · 结局 (Endings, ≥ 10 且全部可达)

- [ ] **≥ 10 个结局,且每一个都有引擎侧触发路径**。
  ⚠️ 根游戏教训:`data/endings.ts` 定义 16 个结局,但引擎 `lifecycle.ts` 只接线 5 个(寿终/战死/破关陨落/走火入魔/飞升),11 个「歧路」结局仅存在于数据与测试,玩家永远看不到。新游戏**禁止**出现 data-only 结局
- [ ] 结局构成:≥ 1 登顶(victory)、≥ 4 陨落变体(寿元/战死/突破/机制专属死法)、**≥ 3 由旗标/机制驱动的「歧路」结局**(归隐/入魔/棋痴/执子成魔等,由玩家行为累积触发)
- [ ] 每结局唯一 id + 标题 + 盖棺文案;结局屏展示生涯统计(总掷骰/巅峰境界/击杀/失败突破等,对照 `stats` 块)
- [ ] 数据完整性测试断言:结局表 ≥ 10、每个结局 id 至少被一处引擎代码或事件效果引用(可达性静态证明)

## G7 · 无障碍 (Accessibility)

- [ ] 叙事卷轴 `aria-live="polite"`(根游戏已有,保持)
- [ ] 所有图标按钮带 `aria-label`;抽屉/对话框带标题与 `sr-only` 描述
- [ ] 全键盘可玩:数字键映射指令/战术/事件选项并写入 README(对照根游戏 1–9 快捷键);输入框聚焦时快捷键让位
- [ ] 焦点环可见(`--ring` token);打字机效果可点击/按键跳过
- [ ] `prefers-reduced-motion` 降级动效(根游戏未做,新游戏必做;根游戏列入 R2 补课)
- [ ] 正文对比度 ≥ 4.5:1(浅色主题的烂柯尤其注意纸底墨字的中间灰)

## G8 · 主题唯一性 (Theme Uniqueness)

- [ ] 独立调色板 tokens(`@theme` 变量整套重命名,不复用 ink/gold 值)、独立字体组合、独立叙述者人设(天道/司命/棋魂…)与语气
- [ ] **≥ 1 个签名机制**为本作独有且其余三作没有(棋盘天机 / 劫运日历+推演 / 道纹刻画+双轨修行,见 briefs)
- [ ] 全部叙事文案原创,不得从根游戏复制段落;术语表(境界名/货币名/指令名)与其他三作零重合
- [ ] 四作并排截图可在 3 秒内被区分(色彩、版式、纹样)

## G9 · 确定性与防作弊对齐 (Parity)

- [ ] 种子化骰子权柄(mulberry32 或等价,序列化态入存档)、逐掷审计(理由+骰前状态)、封印掷
- [ ] 回合哈希链 + 存档校验和信封 + 载入拒绝篡改(「因果紊乱」等价文案)
- [ ] 回合末不变量断言,违者整回合回滚;单一写入者(唯 turn 解析器产状态)
- [ ] 命令白名单 + 许愿拒绝;审计指令公开掷骰记录
- [ ] 同种子同指令序列 ⇒ 逐字节一致回放(测试锁死)

## G10 · 工程卫生 (Hygiene)

- [ ] 引擎/数据层零 React、零浏览器 API(存档适配器注入例外)—— 架构铁律延续
- [ ] 各游戏 README:玩法、指令表、快捷键、构建/部署、机制说明
- [ ] 不留死代码双轨(根游戏教训:`lifecycle.advanceTime`/`lifecycle.rest` 与 `turn.ts` 内实现重复,`data/endings.ts` 与 `lifecycle.ENDING_DEFS` 双源 —— 新游戏单一事实源)
- [ ] `games/*` 之间互不 import;若 Round 2+ 决定抽 `packages/engine-core/`,须一次性迁移并保持四作全绿

## G11 · 发布 (Release)

- [ ] 每款 `out/` 可独立打 zip,zip 内含 README 片段(如何 `python3 -m http.server` 启动)
- [ ] 根游戏保持原样可发布(回归验证:157 测试 + build)

---

## 一键验收脚本(目标形态)

```bash
# 根游戏回归
npm run build && npx vitest run && npm run typecheck
# 三款新游戏
for g in games/lanke-qiyuan games/mieyun-tulu games/dao-jun; do
  (cd "$g" && npm install && npm run typecheck && npm run lint && npx vitest run && npm run build) || exit 1
done
```

## 计分基线(供 R2/R3 回顾)

| 维度 | 根游戏现状 | 新游戏门槛 |
|---|---|---|
| 测试 | 157 | ≥ 40/款 |
| 事件 | 67 | ≥ 40/款 |
| 结局(可达) | **5**(数据 16,接线 5 ⚠️) | ≥ 10 全可达 |
| 出身 | 6 | ≥ 6 |
| 物品/敌人/NPC | 90/28/12 | ≥ 40/≥ 15/≥ 8 |
| 战术 | 6 | ≥ 3(换皮) |
| 无障碍 | aria-live + labels + 快捷键;缺 reduced-motion | 全项 |
