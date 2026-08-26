# Monorepo tooling

The root npm project owns orchestration for the four static games:

| Tool ID | Source directory | Build output |
|---|---|---|
| `mortal` | repository root | `dist/mortal/` |
| `lanke` | `games/lanke-qiyuan/` | `dist/lanke/` |
| `mieyun` | `games/mieyun-tulu/` | `dist/mieyun/` |
| `daojun` | `games/dao-jun/` | `dist/daojun/` |

Child games are npm workspaces selected by `games/*`. Run `npm install` at the
repository root after adding or changing a child game's dependencies.

## Commands

```bash
# Build every available game and collect its static export under dist/
npm run build:all

# Run each available game's own npm test script
npm run test:all

# Zip existing static exports to dist/zips/{mortal,lanke,mieyun,daojun}.zip
npm run package:all

# Rebuild each game, time it, measure all files in out/, and write a JSON report
npm run benchmark

# Measure existing out/ directories without rebuilding
npm run benchmark -- --no-build
```

`build:all` expects each build to create an `out/` directory. `package:all`
therefore runs after `build:all`; it uses `zip`, with Python 3's `zipfile` as a
fallback. The benchmark records elapsed wall-clock build time, exported file
count, and total uncompressed static-export bytes in `dist/benchmark.json`.

All orchestrators print a clear skip when a game directory has not landed yet,
so the scripts remain usable while games are integrated concurrently. Once a
game has a `package.json`, a missing required `build` or `test` script is an
error rather than a silent skip.

## Smoke coverage

`scripts/__tests__/monorepo.smoke.test.ts` runs as part of the root Vitest suite.
It checks workspace commands, all four game mappings, Bash syntax, and the
benchmark CLI entry point.

## Benchmark baseline

Run the benchmark on the target build machine after all games are present.
Compare `bytes` directly across runs; build duration is machine- and
cache-dependent. Generated exports, archives, and benchmark reports under
`dist/` are intentionally ignored by Git.
