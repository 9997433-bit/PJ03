# 多小说人生模拟器 — 主调度进度

## 任务目标
基于《凡人修仙传·人生模拟器》架构，再开发 **3 款** 非顶流小说改编的人生模拟器，均可静态导出、浏览器直接游玩。

## 选定小说（非顶流，题材各异）

| ID | 小说 | 作者 | 题材特色 | 目录 |
|----|------|------|----------|------|
| G1 | 《烂柯棋缘》 | 真费烟 | 棋道、游历、因果、温和修仙 | `games/lanke-qiyuan/` |
| G2 | 《灭运图录》 | 爱潜水的乌贼 | 命运、劫运、功法体系、理性修仙 | `games/mieyun-tulu/` |
| G3 | 《道君》 | 萧舒 | 道纹、神魂、斗法、道途抉择 | `games/dao-jun/` |

> 已有成品：《凡人修仙传·人生模拟器》保留于仓库根目录。

## 技术约束
- TypeScript + Next.js 16 静态导出（`output: 'export'`）
- 纯前端，Zustand 存档，种子化骰子引擎
- 每款游戏独立 `package.json`，共享 `packages/engine-core/` 可选抽象
- 157+ 测试为基线参考；每款至少 40 项测试

## 3 轮 Loop 状态

| Round | 状态 | 6 子代理 | 结论简报 |
|-------|------|----------|----------|
| R1 | ✅ 完成 | 2×fable + 2×opus-fast + 2×gpt-sol | [ROUND1_BRIEF.md](./ROUND1_BRIEF.md) |
| R2 | 🔄 进行中 | 2×fable + 2×opus-fast + 2×gpt-sol | — |
| R3 | ⏳ 待启动 | — | — |

## Round 1 子代理分工

| 代理 | 模型 | 职责 |
|------|------|------|
| R1-F1 | fable | 全局 monorepo 架构 + 三游戏 PLAN.md |
| R1-F2 | fable | 现有代码审计 + SOTA 验收标准 |
| R1-O1 | opus-fast | G1 烂柯棋缘：脚手架+引擎+UI+内容 |
| R1-O2 | opus-fast | G2 灭运图录：脚手架+引擎+UI+内容 |
| R1-S1 | gpt-sol | G3 道君：脚手架+引擎+UI+内容 |
| R1-S2 | gpt-sol | 共享构建脚本 + 三游戏探针/基准测试 |

## 发布目标
- 每款游戏独立 zip + GitHub Release 资产
- 可直接 `python3 -m http.server` 游玩

## R1-S2 工具链
- 根项目采用 npm workspaces（`games/*`），统一提供 `build:all`、`test:all`、`package:all` 与 `benchmark`
- 四游戏固定产物目录：`dist/{mortal,lanke,mieyun,daojun}/`
- 缺席的并发游戏会明确跳过；已存在游戏的失败会聚合报告，但不会阻止其余游戏运行
- 根级 smoke test 已随 163 项测试通过；Mortal 构建、复制与 zip 打包已验证
- 基准报告写入 `dist/benchmark.json`；Mortal 基线为 2.898s / 16,213,806 bytes / 332 files
- 聚合测试当前为 Mortal 163 项、Daojun 73 项通过；Lanke 与 Mieyun 尚无测试文件
- 三个并发子项目仍未形成有效首页导出（Lanke 仅 404、Mieyun 缺 app/pages、Daojun 有 `EndingKey` 类型错误），合入后须复测完整基线

## R1-F2 审计要点
- 交付：`SOTA_CRITERIA.md`（G0–G11 验收单）、`REUSE_MAP.md`（逐文件复用地图 + 拷贝-适配策略）、`briefs/{lanke,mieyun,daojun}.md`（各 3 项签名机制、领域模型、工程常量、测试焦点）
- 基线复核：根游戏 build ✅ / 157 测试 ✅ / 静态导出 ✅
- ⚠️ 根游戏缺口（R2/R3 备选补课）：结局 16 定义仅 5 接线（data/endings.ts 未入引擎）；lifecycle.advanceTime/rest 死代码双轨；缺 prefers-reduced-motion
- ⚠️ 硬约束：同源部署下 localStorage 共享 —— 各游戏 SAVE_KEY/SAVE_MAGIC 必须唯一（lanke_save_v1 / mieyun_save_v1 / daojun_save_v1）；结局须「引擎接线可达」而非仅存数据

## Round 2 进展（进行中）

| 代理 | 状态 | 要点 |
|------|------|------|
| R2-S1 道君 | ✅ | 98 测试 · 40 事件 · e2e/smoke 5/5 · `daojun_save_v1` |
| R2-S2 流水线 | 🔄 | mortal+lanke+daojun zip 已产出 · mieyun 待 build |
| R2-F1/F2 文档 | ✅ | PLAN ×3（lanke/mieyun/daojun 全交付，R2-F1 已按落盘代码重接地：五心/棋缘、气运劫运、纹魂疆域，各 16 结局全接线表）· ARCHITECTURE.md（R1-F1 基底 + R2-F1 增补 §10 命名冲突登记 / §11 文档冲突裁定）· engine-core 契约包（types-only）· briefs 三份 |
| R2-F2 道君审计 | ✅ | [AUDIT_daojun_R2.md](./AUDIT_daojun_R2.md) · **7.5/12**（修复前 5.5）· 320 局 bot 通关模拟 · 4 项快修（lint+Math.random 禁令 / noUncheckedIndexedAccess / 软锁 / 结局优先级）· 101 测试全绿 |
| R2-O1 烂柯 | ✅ | 211 测试 · build 通过 · out/index.html · 青竹枯枰 UI |
| R2-O2 灭运 | 🔄 | **仍缺 app/** · build/test 失败 |

当前可打包游玩：凡人 + 道君（`dist/zips/`）

## 日志
- 2026-08-26: 初始化分支与 PROGRESS.md，启动 Round 1（6 并发子代理）
- 2026-08-26: R1-S2 添加 monorepo 构建、测试、打包、基准脚本及根级 smoke test
- 2026-08-26: R1-S2 完成 Mortal 基线；工具链能隔离 workspace 类型检查并聚合报告子游戏失败
- 2026-08-26: R1-F2 完成代码审计与 SOTA 验收标准；补交三份 per-game briefs
- 2026-08-26: R2-S1 道君 SOTA 打磨完成（98 测试，探针全绿）
- 2026-08-26: R1-F1(架构) 交付：`.agent_workspace/ARCHITECTURE.md`（目录布局/共享边界/流水线/8 项 R2 风险）、三游戏 PLAN.md（各 18 结局+指令表+主题色+测试计划+MoSCoW）、`packages/engine-core` 契约包、根 workspaces 增补 `packages/*`、根 README monorepo 索引
- 2026-08-26: R2-F2 道君 G0–G11 交叉审计完成（7.5/12）：G0 补 lint+noUncheckedIndexedAccess、修软锁（资源枯竭死局）与结局同回合优先级；**关键发现**：320 局 bot 实测仅 4/12 结局可达（里程碑结局遮蔽全部登顶线），G4 战斗/经济与 G9 防作弊链为 R3 两大结构缺口；根游戏回归 164/164 全绿
- 2026-08-26: R2-F1 文档收口：三份 PLAN.md 以已落盘引擎/数据模型重写接地（烂柯 16 结局/棋盘天机+烂柯观弈、灭运 16 结局/劫运账簿+匿运改命、道君 16 结局/斗法重做+G9 补课清单，均含结局→引擎接线表与判定序）；ARCHITECTURE.md 增补跨作命名冲突登记表（道君境界撞根游戏、烂柯灭运「凡尘/通玄」互撞、「灵石」双撞 → 已裁定改名）与并发文档冲突裁定（R1-F1 从零稿留 git 历史，可移植创意标注待 R3 吸收）
