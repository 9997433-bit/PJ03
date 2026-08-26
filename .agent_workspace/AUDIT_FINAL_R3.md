# Round 3 终审 — 四款人生模拟器 SOTA 验收（G0–G11）

> 审计者：R3-F1（Final SOTA Auditor，claude-fable-5-thinking-xhigh）· 2026-08-26
> 审计对象：`cursor/agent-multi-novel-games-b603` @ **`48ded19`**（origin 推送顶点）
> 方法：独立 detached worktree 全流水线实测（`test-all` / `build-all` / `validate-exports` / 逐游戏 `typecheck` + `lint`）+ 逐门槛代码走查
> 依据：[SOTA_CRITERIA.md](./SOTA_CRITERIA.md)（G0–G11）、[ROUND2_BRIEF.md](./ROUND2_BRIEF.md) 遗留清单、AUDIT_daojun_R2.md（320 局 bot 数据）

---

## 0. 审计期间的分支异动（必读）

审计启动时分支顶点为 `da47091`/`b29fdcc`（同补丁双 SHA）——该提交**是坏的**：
`games/dao-jun/engine/game.ts` 引入 `./audit`，但 `audit.ts / combat.ts / market.ts / power.ts / save.ts`
从未 `git add`，导致道君 typecheck / test / build 三红，**且已推送到 origin**。
审计中途 `abf1eff` 将道君回退到 R2 稳定版，随后 `0f5cf87`（烂柯 G8 改名）与
`48ded19`（道君 G8 改名）落地。本报告以 **`48ded19`** 为最终裁定基准；
道君 G4/G9 重做仍在 `cursor/daojun-r3-sota-a9cb` 分支上进行中，未合入。

**教训（对全体 R3 代理）：推送前必须在干净树上跑 `npm run test:all`，禁止把半成品提交推上共享分支。**

## 1. 流水线实测（@ 48ded19）

| 检查 | 凡人（根） | 烂柯 G1 | 灭运 G2 | 道君 G3 |
|---|---|---|---|---|
| `test-all`（vitest） | ✅ 164/164（9 文件） | ✅ 292/292（11 文件） | ✅ 412/412（19 文件） | ✅ 101/101（1 文件） |
| `build-all`（静态导出） | ✅ 17MB | ✅ 18MB | ✅ 896KB | ✅ 752KB |
| `validate-exports` | ✅ out/index.html | ✅ | ✅ | ✅ |
| `typecheck`（strict + noUncheckedIndexedAccess） | ✅ | ✅ | ✅ | ✅ |
| `lint` | ❌ **8 错误**（react-hooks 新规则：Typewriter/setState-in-effect、rules-of-hooks 等） | ✅ | ❌ **无 lint 脚本、无 eslint 配置**（Math.random 禁令未设防；实测仅 rng.ts 用到） | ✅ |

四款合计 **969 项测试全绿**。`da47091` 时点道君曾三红（见 §0），`abf1eff` 已恢复。

## 2. G0–G11 逐门槛矩阵

✅ 通过 · ⚠️ 部分通过（计 0.5） · ❌ 未过（计 0）

| 门槛 | 凡人（根） | 烂柯 G1 | 灭运 G2 | 道君 G3 |
|---|---|---|---|---|
| G0 构建与类型 | ⚠️ lint 8 错 | ✅ | ⚠️ 缺 lint 门 | ✅ |
| G1 测试 ≥40 + 必测清单 | ✅ 164 | ✅ 292（rng/创角/推进/审计/回合/数据完整性/棋盘专项/存档） | ✅ 412（含 dataIntegrity、reachability、soak、seal） | ⚠️ 101 项但单文件，缺数据完整性交叉引用与审计链专项 |
| G2 静态导出可玩 | ✅ `mcls_save_v1`/MCLS | ✅ `lanke_save_v1`/LKQY | ✅ `mieyun_save_v1` | ✅ `daojun_save_v1`（但存档裸 JSON，见 G9） |
| G3 创角流程 | ✅ 4 步 | ✅ 步进门禁 + 6 出身 + 隐藏「缘法」 | ✅ 步进门禁 + 6 出身 + 暗掷「道缘」D100 | ❌ 步进门禁有，但**出身仅 4 种**（<6）、无隐藏属性暗掷 |
| G4 战斗与经济 | ✅ 6 战术 | ✅ 5 弈风（稳守/急攻/弃子/试探/封盘）+ 买卖价差 + 认输出口 | ✅ 4 战术 + 胜后三择（灭运/饶恕/搜刮）+ 市场 | ❌ **无市场/买卖闭环**；「斗法」是二选一事件，非回合战术制（重做在 daojun-r3-sota 分支未合入） |
| G5 事件 ≥40 | ✅ 67 | ✅ 60 · 换皮分桶（波折…）· 21 处 once/requiresFlag | ✅ 51 · 五桶（大凶…大吉）+ destiny 线 · 16 处旗标 | ⚠️ 40 个（压线）· 按指令分池**无 D100 分桶**、**零 flag 链 / once 去重 / 隐藏门** |
| G6 结局 ≥10 全可达 | ❌ 数据 16 / 接线仅 5（历史债，未修） | ✅ 12/12 · 单一触发表 + 静态可达性测试 | ✅ 14/14 接线；13 个 bot 实证，`tulu_chushi` 有单测构造证明但 bot 未验 | ❌ 12 个全接线，但 R2 320 局 bot 仅 4/12 实际可达（里程碑结局遮蔽登顶线，判定序在 `evaluateEnding` 依旧） |
| G7 无障碍 | ✅ aria-live/labels/快捷键入 README/reduced-motion | ⚠️ 代码键盘全套 + aria×17，**README 无快捷键表** | ⚠️ 同左（aria×17，README 无快捷键表） | ⚠️ 基本项有 + README 有键位，label 覆盖薄（×5） |
| G8 主题唯一性 | ✅ 基线持有 天道/灵石/炼气系 | ⚠️ 弈者✅ 墟市✅ 银钱✅；**「凡尘/通玄」仍与灭运互撞** | ⚠️ 叙事独有；**「凡尘/通玄」互撞 + 显示名仍用「灵石」撞根游戏**（裁定：未录/窥命/玄晶） | ✅ 境界 观纹→道君✅ 货币 玄玉✅（本轮已修） |
| G9 确定性与防作弊 | ✅ 审计 35 项 | ✅ 信封+校验和+篡改拒绝+逐字节回放测试 | ✅ 同左 + 链修剪后仍拒篡改（soak） | ❌ 有种子骰，但**无 SaveEnvelope/校验和/哈希链/篡改拒绝**，存档裸 JSON 读写在组件内 |
| G10 工程卫生 | ⚠️ lifecycle 死代码双轨 + 结局双源未清 | ✅ 引擎零 React、单一事实源、无跨作 import | ✅（`window.localStorage` 为准许的适配器例外） | ⚠️ 存档逻辑在 React 组件内；测试单文件；`packages/engine-core` 四作均未采用（休眠） |
| G11 发布 | ✅ zip + 回归绿 | ⚠️ zip 为改名前旧构建 | ⚠️ 同左 | ⚠️ zip 为改名前旧构建 |

## 3. 发布就绪评分与裁定

| 游戏 | 得分（/12） | 发布就绪 | 一句话裁定 |
|---|---|---|---|
| 烂柯 G1 | **11.0** | **✅ YES** | 工程最全面；补 README 快捷键表、与灭运协调「凡尘/通玄」即满分 |
| 灭运 G2 | **10.5** | **✅ YES（带注）** | 内容与防作弊最深；缺 lint 门 + 三个改名（未录/窥命/玄晶）为纯机械修 |
| 凡人（根） | **10.0** | **✅ YES（基线）** | 玩法/导出/测试全绿可直接发布；lint 8 错与 16-接-5 结局为历史债不阻发 |
| 道君 G3 | **5.5** | **❌ NO** | G3/G4/G6/G9 四门结构性未过；重做工作在 `daojun-r3-sota` 分支未合入 |

## 4. 首要阻塞（Top 3）

1. **道君结构缺口未合入**：G4（无市场/无战术制战斗）、G9（无存档信封/防篡改/哈希链）、G6（结局遮蔽 4/12）、G3（4 出身、无暗掷）。修复在 `cursor/daojun-r3-sota-a9cb` 进行中——**合入前必须全绿**（今晨 `da47091` 半成品推送已让共享分支红过一次）。
2. **G0 lint 双缺**：根游戏 8 个 react-hooks 错误（升级 eslint-config-next 带来的新规则）；灭运完全没有 lint 脚本/配置（Math.random 禁令未设防）。两者皆是小修，但按验收单属硬门。
3. **发布链未完成 + zip 过期**：`dist/zips/` 四包均为 G8 改名**之前**的构建；GitHub Release v2.0.0、INSTALL.md、用户下载页、合 main 的 PR 全部未做。残余 G8 改名（灭运 未录/窥命/玄晶）落地后需统一重打包。

## 5. 附注

- 秘密结局 `tulu_chushi`：引擎接线 + 单测构造证明齐备（`reachability.test.ts:370`），惟 bot 全程模拟未覆盖 —— 建议 R3 在 soak 中加一条剧本线，非阻塞。
- 四作出口零外网请求（构建产物扫描确认）；凡人/烂柯 next/font 自托管 woff2，灭运/道君用系统字栈，均合规。
- 存档键四作唯一，已互不冲突：`mcls_save_v1` / `lanke_save_v1` / `mieyun_save_v1` / `daojun_save_v1`。
- 跨作零互相 import；`packages/engine-core` 无人使用，建议 R3 收尾时在 README 标注「契约参考，未启用」或移除。
