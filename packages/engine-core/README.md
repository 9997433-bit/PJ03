# @pj03/engine-core

四款人生模拟器（凡人修仙传 / 烂柯棋缘 / 灭运图录 / 道君）共享的**引擎契约包**。

## Round 1 定位：契约优先，实现后置

- 本包当前**只含 TypeScript 类型**（`src/index.ts`），零依赖、零运行时代码。
- 各游戏在 Round 1/2 **自带（vendor）** `rng.ts` / `audit.ts` / `save.ts` 的实现副本
  （以仓库根目录《凡人修仙传》的 `src/engine/` 为参考实现），但**必须**与本包的
  接口签名保持一致。
- Round 3 收敛：把四份相同的实现合并进本包，各游戏改为 import，删除副本。
  由于签名一致，这一步是机械替换。

这样做的原因：Round 1 有多个代理并行开发三款游戏，若共享包先行实现，任何一处
改动都会同时阻塞三条流水线；契约先行 + 各自 vendor 是并行开发下的最低耦合方案。

## 契约内容

| 导出 | 作用 |
|---|---|
| `Rng` / `DiceRoll` / `DiceKind` | 种子化骰子权柄（参考实现 mulberry32），一切随机必经此处并记录 |
| `TurnResolver<S, C>` / `TurnResult<S>` / `TurnLogEntry` | 回合解析器：唯一状态写入者，纯函数 |
| `AuditEntry` | 回合哈希链（防作弊审计） |
| `SaveEnvelope<S>` / `StorageAdapter` | 版本化校验和存档信封；存储由 UI 注入 |
| `GameMeta` | 游戏身份（id/标题/叙述者），用于存档 key、dist 目录与 zip 命名 |

## 使用方式（Round 3 起）

```jsonc
// games/<id>/package.json
{ "dependencies": { "@pj03/engine-core": "*" } }
```

```js
// games/<id>/next.config.mjs — TS 源码直出，需转译
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ['@pj03/engine-core'],
};
```

在仓库根目录执行 `npm install`（npm workspaces 负责链接），**不要**在包内单独安装。

## 铁律（与根游戏一致）

1. 引擎与数据代码不 import React、不触碰浏览器 API（存储适配器注入除外）。
2. 每条规则都是纯函数 `(state, input, rng) → (state', logs[])`。
3. 随机数单点入口且逐次审计；固定种子可全程重放。
4. 仅回合解析器产生新状态。
