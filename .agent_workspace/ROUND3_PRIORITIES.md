# Round 3 修复优先级清单（供 R3 各代理认领）

> 出处：R3-F1 终审（[AUDIT_FINAL_R3.md](./AUDIT_FINAL_R3.md)，基准 `48ded19`）· 2026-08-26
> 排序原则：先解阻塞（道君四门 + 硬门 lint），再清 G8 残余，最后走发布链。
> **铁律：任何提交推上共享分支前，在干净树跑 `npm run test:all && npm run build:all` 全绿。**

---

## P0 — 发布阻塞

### 1. 道君 G9：存档信封 + 防作弊链（负责：道君代理，进行中 @ `cursor/daojun-r3-sota-a9cb`）
- SaveEnvelope：`magic`（建议 `DJSS`）+ version + checksum（sha256）+ auditHash 交叉校验；载入拒绝篡改（「因果紊乱」等价文案）
- 逐掷审计（理由 + 骰前状态）+ 回合哈希链 + 回合末不变量断言（灵石/玄玉不为负，违者回滚）
- 存档逻辑从 `DaoJunGame.tsx` 迁入 `engine/save.ts`（存储适配器注入），键保持 `daojun_save_v1`
- 验收：对照灭运 `save.test.ts` / `seal.test.ts` 移植测试；同种子同指令序列逐字节回放测试

### 2. 道君 G4：经济闭环 + 回合制斗法（同上，进行中）
- 市场「法会」：买/卖有价差（卖<买）、按境界分层解锁、≥1 消耗性生产系统（刻纹耗材即可）
- 战斗按 ARCHITECTURE §10 裁定六式：力破/周旋/布纹/摄神/吞丹/遁土；胜/败/逃三出口，败北分劫财/夺命两级；战斗相位锁 + 掉落走审计骰
- 验收：≥5 项战斗专项测试 + 经济不变量测试

### 3. 道君 G6：结局解遮蔽（R2 已定位：320 局 bot 仅 4/12 可达）
- `evaluateEnding` 里程碑结局（conqueror/patternSage/soulAscendant/magnate/benevolent）改为**可辞谢**（pendingMilestone + declinedEndings 草案方向正确，勿再丢文件）或按 vow 对齐后才触发
- 验收：bot 模拟（≥300 局混合策略）12/12 可达 + 静态引用测试锁死

### 4. 道君 G3/G5：创角与事件补课
- 出身 4 → ≥6（补 2 种带机读 perk）；创角加一次暗掷隐藏属性（如「道骨」，永不进 UI 字符串）
- 事件：40 → 引入 D100 五桶（或换皮）+ once/requiresFlag 机制 + ≥5 条 flag 链 + 隐藏属性门；数据完整性测试锁桶覆盖
- 验收：移植灭运 `dataIntegrity.test.ts` 骨架，engine.test.ts 拆分为分域多文件

### 5. G0 lint 双缺（负责：任一空闲代理，改动小）
- 根游戏：修 8 个 react-hooks 错误（`src/components/game/Typewriter.tsx` setState-in-effect ×5、rules-of-hooks `useItem` 命名 ×1、refs-during-render ×2）——多为改名/useMemo 化，勿动引擎
- 灭运：补 `eslint.config.mjs`（带 `no-restricted-properties` Math.random 禁令，豁免 `rng.ts`）+ `package.json` 加 `lint` 脚本
- 验收：四目录 `npm run lint` 全零错

## P1 — G8 残余改名（ARCHITECTURE §10 已裁定，纯机械）

### 6. 灭运三改名（负责：灭运代理）
- 境界显示名：`凡尘`→**未录**、`通玄`→**窥命**（`src/data/realms.ts` + 测试快照）
- 货币显示名：`灵石`→**玄晶**（字段 `stones` 不动，仅 UI/文案；market.ts 5 处起步）
- 市场名确认为**万法坊**
- 验收：`grep -r "凡尘\|通玄\|灵石" src/` 零余留（注释除外）；412 测试全绿

### 7. 烂柯确认项（负责：烂柯代理）
- 「凡尘/通玄」按裁定由灭运让名，烂柯**保留不动**——与 #6 协调即可，无代码改动
- README 补快捷键表（G7）；灭运 README 同（键盘代码两作均已实现，仅缺文档）

## P2 — 质量增强（非阻塞）

### 8. 灭运 `tulu_chushi` bot 实证
- 在 `soak.test.ts`/`reachability.test.ts` 加一条定向剧本（三卷合一 + 灭运真解 + 长生）跑通秘密结局

### 9. 根游戏历史债（可选，勿影响 157/164 基线）
- 结局 16 定义仅 5 接线：如接线成本高，最低限度在 `data/endings.ts` 标注「展示用」并从数据完整性口径剔除，消除双源假象
- 清理 `lifecycle.advanceTime`/`rest` 死代码双轨
- `packages/engine-core`：README 标注「契约参考，未启用」或整体移除

## P3 — 发布链（全部 P0/P1 合入后）

### 10. 统一重打包 + Release（负责：流水线代理）
- 在最终 SHA 跑 `test:all` → `build:all` → `validate:exports` → `package:all`，重生成四 zip（现有 `dist/zips/` 为 G8 改名前旧构建，**作废**）
- zip 内附一行启动说明（`python3 -m http.server`）；写 INSTALL.md
- GitHub Release v2.0.0 挂四 zip；README/下载页给用户逐款直链
- 开结构化 PR 合 main（正文含四游戏矩阵 + 969 测试证据 + 本审计链接）

---

## 认领与回报

| # | 优先级 | 预估改动面 | 状态 |
|---|---|---|---|
| 1–4 | P0 | 道君 engine/ 大改 + 测试翻倍 | 🔄 daojun-r3-sota 分支进行中 |
| 5 | P0 | 根 4 个组件文件 + 灭运 2 个配置文件 | 待认领 |
| 6–7 | P1 | 灭运 data/UI 文案 + 两份 README | 待认领 |
| 8–9 | P2 | 测试增量 | 待认领 |
| 10 | P3 | 脚本已就绪，仅执行 | 等 P0/P1 |

完成任一项后：更新 [PROGRESS.md](./PROGRESS.md) 日志 + 在本表打 ✅。
