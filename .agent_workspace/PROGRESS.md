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
| R1 | 🔄 进行中 | 2×fable + 2×opus-fast + 2×gpt-sol | — |
| R2 | ⏳ 待启动 | — | — |
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
- 缺席的并发游戏会明确跳过；游戏目录落地后，缺少 `build` / `test` 脚本将作为错误处理
- 基准报告写入 `dist/benchmark.json`；完整游戏基线待三个子项目合入后复测

## 日志
- 2026-08-26: 初始化分支与 PROGRESS.md，启动 Round 1（6 并发子代理）
- 2026-08-26: R1-S2 添加 monorepo 构建、测试、打包、基准脚本及根级 smoke test
