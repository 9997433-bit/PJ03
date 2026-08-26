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

# Verify every source export has an out/index.html entry point
npm run validate:exports

# Rebuild each game, time it, measure all files in out/, and write a JSON report
npm run benchmark

# Measure existing out/ directories without rebuilding
npm run benchmark -- --no-build

# Write a named report for a specific validation round
npm run benchmark -- --no-build --output dist/benchmark-r2.json
```

`build:all` expects each build to create an `out/index.html` entry point, which
prevents an incomplete Next project that exports only a 404 page from passing.
It clears the prior source and collected exports before each build so stale
artifacts cannot mask a failure. `package:all` therefore runs after `build:all`;
it uses `zip`, with Python 3's `zipfile` as a fallback, removes stale archives,
and verifies that every ZIP contains `index.html` at its root. The benchmark
records elapsed wall-clock build time, exported file count, and total
uncompressed static-export bytes in `dist/benchmark.json` by default; `--output`
selects a different report path.

All orchestrators print a clear skip when a game directory has not landed yet,
so the scripts remain usable while games are integrated concurrently. Once a
game has a `package.json`, a missing required `build` or `test` script is an
error rather than a silent skip. A failure in one available game does not stop
the remaining games from running; the command prints an aggregate summary and
returns a nonzero status after all attempts finish.

## Smoke coverage

`scripts/__tests__/monorepo.smoke.test.ts` runs as part of the root Vitest suite.
It checks workspace commands, all four game mappings, Bash syntax, and the
benchmark CLI entry point.

## Benchmark baseline

Round 1 baseline on Node v22.14.0 / Linux x64:

| Game | Build | Exported files | Export bytes | Integration state |
|---|---:|---:|---:|---|
| `mortal` | 2.898 s | 332 | 16,213,806 | valid |
| `lanke` | 2.339 s | — | — | only `/404`; no `out/index.html` yet |
| `mieyun` | 0.455 s | — | — | build failed; app/pages directory not landed yet |
| `daojun` | 0.789 s | — | — | build failed; `app/globals.css` not landed yet |

The three child workspaces were still being authored when this baseline was
captured. Re-run it after their integration. Compare `bytes` directly across
runs; build duration is machine- and cache-dependent. Generated exports,
archives, and benchmark reports under `dist/` are intentionally ignored by Git.
