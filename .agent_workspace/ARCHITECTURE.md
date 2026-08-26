# PJ03 Monorepo 架构（多小说人生模拟器）

> 作者：R1-F1（架构规划代理）。本文档是四款游戏（凡人/烂柯/灭运/道君）的**结构性
> 事实来源**：目录布局、共享与独立代码边界、构建发布流水线、质量门。
> 配套文档：`SOTA_CRITERIA.md`（验收单）、`REUSE_MAP.md`（复用地图）、
> `TOOLING.md`（编排脚本细节）、各游戏 `games/*/PLAN.md`（玩法设计）。

## 1. 目录布局

```
/                              # 仓库根 = npm workspaces 宿主 + 第一款游戏《凡人修仙传》
├── package.json               # 根游戏 manifest + workspaces: ["games/*", "packages/*"]
│                              #   + 编排脚本 build:all / test:all / package:all / benchmark
├── package-lock.json          # 唯一 lockfile（workspaces 单锁；子包 lockfile 已 gitignore）
├── next.config.mjs            # output:'export' + trailingSlash:true + images.unoptimized
├── src/                       # 《凡人修仙传》engine/data/store/components 四层
├── scripts/                   # 编排：build-all.sh test-all.sh package-all.sh benchmark.mjs
│   └── __tests__/             #   monorepo smoke test（随根 vitest 跑）
├── packages/
│   └── engine-core/           # @pj03/engine-core — 共享引擎契约（R1 仅类型，R3 收敛实现）
├── games/
│   ├── lanke-qiyuan/          # G1《烂柯棋缘》 独立 Next 应用（PLAN.md + src/…）
│   ├── mieyun-tulu/           # G2《灭运图录》 独立 Next 应用
│   └── dao-jun/               # G3《道君》     独立 Next 应用
├── dist/                      # （gitignore）build:all 汇集产物
│   ├── mortal/ lanke/ mieyun/ daojun/   # 各游戏静态导出副本
│   ├── zips/{mortal,lanke,mieyun,daojun}.zip
│   └── benchmark.json
└── .agent_workspace/          # 编排文档（本文件、进度、验收、复用地图、briefs）
```

**为什么根目录既是宿主又是游戏**：《凡人》成品先于 monorepo 存在且被要求保留在根。
把根 package.json 同时用作 workspaces 宿主可避免一次高风险的整仓搬迁；代价是根依赖
与子游戏依赖同锁（见 §3 纪律）。

## 2. 共享 vs 独立代码边界

| 层 | 归属 | 说明 |
|---|---|---|
| 引擎契约（Rng/DiceRoll/TurnResolver/SaveEnvelope/AuditEntry/GameMeta） | **共享** `@pj03/engine-core` | R1/R2 仅类型；各游戏 vendor 参考实现但签名必须一致 |
| rng/audit/save 实现 | R1/R2 各游戏 vendor；**R3 收敛**进 engine-core | 收敛前提：三游戏测试全绿后做机械替换，一次一游戏 |
| 玩法规则（回合/战斗/进度/特色系统） | **独立** 每游戏 `src/engine/` | 玩法差异是产品价值，禁止为共享而抽象 |
| 内容数据（事件/物品/NPC/结局/文案） | **独立** 每游戏 `src/data/` | 永不共享 |
| UI 原语（shadcn/ui 副本） | **独立** 各自 `components/ui/` | 复制成本低于跨包主题化成本（Tailwind v4 扫描边界也更简单） |
| 主题 tokens | **独立** 各自 `globals.css`（`:root[data-game='<id>']` 变量组） | 调色板见 §6 |
| 编排/打包/基准 | **共享** 根 `scripts/` | 由 R1-S2 维护，游戏侧只需保证 `dev/build/test/typecheck` 四脚本存在 |

**共享判据**（新代码归属拿不准时）：跨游戏语义完全一致、且改动频率低（契约级）才
进 engine-core；否则 vendor。并行多代理开发下，共享包是单点阻塞源，宁可重复。

## 3. Workspaces 与安装纪律

- 根 `package.json` 声明 `workspaces: ["games/*", "packages/*"]`。
- **只在仓库根执行 `npm install`**；禁止在子目录单独 install（会生成嵌套 lockfile 与
  node_modules，`.gitignore` 已兜底忽略 `games/*/package-lock.json`）。
- 子游戏依赖版本**必须**与根对齐（next ^16.3.2 / react ^19.2.8 / zustand ^5 / tailwind ^4 /
  vitest ^4 / typescript ^6），避免 hoist 分叉导致的多实例问题。
- 子游戏 `package.json` 四个必备脚本：`dev` `build` `test` `typecheck`
  （`build:all`/`test:all` 对"有 package.json 但缺脚本"按错误处理，不是跳过）。

## 4. 每游戏 Next 配置不变量

```js
// games/<id>/next.config.mjs — 与根一致，三行不可少
{ output: 'export', trailingSlash: true, images: { unoptimized: true } }
```

- `trailingSlash: true` 保证 `out/game/index.html` 目录式导出 →
  `python3 -m http.server` 可直接游玩（发布目标的硬性要求）。
- 禁止：API 路由、Server Actions、`next/image` 优化、任何运行时服务端依赖。
- 可选（合并部署到同域子路径时）：`basePath: process.env.NEXT_BASE_PATH ?? ''`。
  独立 zip 场景不设 basePath。

## 5. 构建 / 发布流水线

```
npm run build:all   # 逐游戏 next build → 校验 out/index.html → 拷贝到 dist/<id>/
npm run test:all    # 逐游戏 npm test（失败聚合报告，不互相阻塞）
npm run package:all # dist/<id>/ → dist/zips/<id>.zip（zip，Python zipfile 兜底）
npm run benchmark   # 构建耗时/文件数/字节数 → dist/benchmark.json
```

- 产物 id 固定映射：`mortal`(根) / `lanke` / `mieyun` / `daojun`（TOOLING.md 表）。
- 发布：四个 zip 作为 GitHub Release 资产；每个 zip 解压后
  `python3 -m http.server` 即玩（R3 验收步骤，需真实执行）。
- CI（R3 可选）：GitHub Actions matrix（4 游戏 × build+test），main 分支产 Release 草稿。

## 6. 游戏身份与隔离

| id | 游戏 | 叙述者 | 存档 key | 主题基调 |
|---|---|---|---|---|
| `mortal` | 凡人修仙传 | 天道 | （既有，不动） | 玄墨鎏金（墨黑/金玉/朱砂） |
| `lanke` | 烂柯棋缘 | 弈者 | `lanke_save_v1` | 竹青棋墨（松烟绿黑/米宣/竹青/赭金） |
| `mieyun` | 灭运图录 | 天机 | `mieyun_save_v1` | 玄紫命金（玄紫黑/月白/命金/劫红） |
| `daojun` | 道君 | 道音 | `daojun_save_v1` | 玄青魂银（玄青黑/霜白/道纹青/符金） |

- **localStorage 同源共享是硬约束**（同域合并部署时四游戏共用一个 origin）：
  存档 key 与 SAVE_MAGIC 必须全局唯一且永不更名（改名 = 玩家灭档）。
- `GameMeta.id` 贯穿存档 key、dist 目录、zip 名、`data-game` 主题选择器。

## 7. 质量门（每游戏，验收以 SOTA_CRITERIA.md 为准）

1. `npm run build` 产出 `out/index.html`（编排脚本硬校验）。
2. `npm run test` ≥40 项通过（引擎纯函数为主；结局判定必须有互斥优先级测试）。
3. `npm run typecheck` 零错误（strict）。
4. 结局必须**引擎接线可达**，不允许只存在于 data 表（凡人 #16 的教训）。
5. 防作弊九层完整继承：骰子单点、命令白名单、隐藏值不入 UI 字符串、种子重放、
   哈希链、存档校验和、不变量断言、单一写入者、审计页签。

## 8. Round 2 风险与对策

| # | 风险 | 现状证据 | 对策 |
|---|---|---|---|
| 1 | **G1/G2 应用层缺失**：烂柯只有 engine（缺 app/UI）、灭运缺 app/ 目录，build 失败 | PROGRESS R2 表、TOOLING 基线（lanke 仅 404 / mieyun 构建失败） | R2 优先补 app 壳与最小 UI 闭环（标题页→捏人→主循环→结局），内容量后补；PLAN.md §12 的 MoSCoW 允许砍 COULD 项 |
| 2 | **共享工作树并发冲突**：多代理同 VM 同分支，出现过 cwd 被改、文件被并发改写 | 本代理提交过程中两次遭遇竞态 | 提交只 stage 自己的路径；shell 命令用绝对路径/`git -C`；push 前不 rebase 别人未推的提交 |
| 3 | **根 lockfile 漂移**：子游戏各自加依赖会反复重写 package-lock.json | 工作树中 lockfile 常态 modified | 依赖版本对齐根（§3）；新增依赖走一次根 `npm install` 并单独提交 lockfile |
| 4 | **三游戏趋同**（都长成换皮凡人） | — | 每游戏 MUST 签名系统不可砍：烂柯=命星棋盘+因果、灭运=命轨改命+纪元劫数、道君=道纹合成+道途抉择；验收时按 PLAN §5 逐项对照 |
| 5 | **结局数量虚标**：18 结局只写文案不接线 | 凡人已有先例（#16） | 质量门 #4 + 每游戏 endings 优先级单测强制覆盖全部结局 id |
| 6 | **engine-core 过早实体化**：有代理想直接 import 未收敛的实现 | — | R2 阶段 engine-core 保持 types-only（package.json 已声明 test 为 no-op）；收敛动作放 R3 且一次一游戏 |
| 7 | **同源存档踩踏** | F2 审计指出 | §6 的 key 表为准，R2 合入时 grep 校验四 key 互异 |
| 8 | **原著版权/文本**：改编不得整段抄录 | — | 各 PLAN 红线条款：致敬用意象与称谓，事件文案全部原创 |

## 9. 路线图

- **R1（本轮）**：架构与契约（本文档、三 PLAN、engine-core 类型、workspaces）+
  S2 工具链 + F2 审计 —— 已交付。
- **R2**：三游戏引擎/UI/内容全量；每游戏测试 ≥40；`build:all` 四绿。
- **R3**：QA 与平衡、engine-core 实现收敛（可选）、四 zip Release、README 索引页。
