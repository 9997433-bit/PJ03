# Round 2 pipeline validation

Date: 2026-08-26  
Environment: Node v22.14.0, Linux x64

## Result

The orchestration pipeline was hardened and re-run after the Lanke and Daojun
Round 2 work landed. Three games are release-ready. Mieyun is not yet
packageable because its delivered tree contains the simulation engine but no
`app/` or `pages/` entry point and no test files.

| Game | Tests | Build/export | ZIP | Benchmark |
|---|---:|---|---|---:|
| `mortal` | 164 passed | `out/index.html` valid, 332 files / 16,217,626 bytes | `dist/zips/mortal.zip`, 14,877,827 bytes, root `index.html` verified | 2.885 s |
| `lanke` | 211 passed | `out/index.html` valid, 23 files / 786,586 bytes | `dist/zips/lanke.zip`, 252,373 bytes, root `index.html` verified | 2.353 s |
| `mieyun` | failed: no test files | failed: no `app/` or `pages/` directory | not created; stale archive removed | failed after 0.442 s |
| `daojun` | 101 passed | `out/index.html` valid, 23 files / 687,615 bytes | `dist/zips/daojun.zip`, 219,013 bytes, root `index.html` verified | 2.220 s |

Aggregate command results:

- `scripts/test-all.sh`: 3 suites passed, 1 failed (`mieyun`)
- `scripts/build-all.sh`: 3 built, 1 failed (`mieyun`)
- `scripts/package-all.sh`: 3 archives created and verified, 1 failed (`mieyun`)
- `scripts/validate-exports.mjs`: 3 valid, 1 missing (`mieyun`)
- `scripts/benchmark.mjs --output dist/benchmark-r2.json`: report written;
  three successful measurements and one recorded failure

## Pipeline changes

- Build orchestration clears each old source export and collected `dist/`
  directory before rebuilding, preventing stale files from hiding failures.
- Packaging removes stale archives, cleans temporary ZIPs after errors, and
  verifies that every created archive has `index.html` at its root.
- `scripts/validate-exports.mjs` reports every game's `out/index.html` and
  exits nonzero when any entry point is missing.
- Benchmarking accepts `--output <path>`, clears stale exports before timed
  builds, and writes `dist/benchmark-r2.json`.
- Root workspace coverage remains `games/*` and `packages/*`; the lockfile was
  synchronized so all three game packages and `packages/engine-core` are
  registered.

## Remaining release blocker

`games/mieyun-tulu` needs a static Next.js entry point and a real test suite.
The pipeline intentionally does not create a misleading archive for the
engine-only tree. After those files land, re-run, in order:

```bash
bash scripts/test-all.sh
bash scripts/build-all.sh
node scripts/validate-exports.mjs
bash scripts/package-all.sh
node scripts/benchmark.mjs --output dist/benchmark-r2.json
```
