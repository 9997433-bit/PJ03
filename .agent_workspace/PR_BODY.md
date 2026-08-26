## Summary

- expand the original Mortal Cultivation simulator into a four-game npm-workspace monorepo
- add complete playable editions of 烂柯棋缘、灭运图录 and 道君, each with its own engine, UI, save key, content and static export
- add root orchestration for testing, building, packaging, export validation and benchmarking
- document the four-game index, per-game run commands and the [GitHub Releases](https://github.com/9997433-bit/PJ03/releases) download entry
- capture the three-round delivery and final measurements in `ROUND3_REPORT.md` and `dist/benchmark-r3.json`

## Game highlights

| Game | Signature systems | Tests |
|---|---|---:|
| 凡人修仙传 | audited dice, cultivation, alchemy and combat | 164 |
| 烂柯棋缘 | Go-based conflict, travel and spirit relationships | 292 |
| 灭运图录 | calamity ledger, deterministic divination and fate theft | 412 |
| 道君 | Dao-pattern synthesis, soul power and territory | 101 |

## Validation

- `bash scripts/test-all.sh` — 4 suites passed, 0 skipped, 0 failed; 969 tests total
- `bash scripts/build-all.sh` — 4 static exports built, 0 skipped, 0 failed
- `node scripts/benchmark.mjs --output dist/benchmark-r3.json` — all four games `ok`
- `npx vitest run scripts/__tests__/monorepo.smoke.test.ts src/store/__tests__/integration.smoke.test.ts` — 2 files and 8 smoke tests passed

Round 3 benchmark on Node v22.14.0 / Linux x64:

| Game | Build | Export size | Files |
|---|---:|---:|---:|
| mortal | 2.900 s | 16,218,990 B | 332 |
| lanke | 2.368 s | 17,766,578 B | 472 |
| mieyun | 2.328 s | 809,956 B | 25 |
| daojun | 2.092 s | 687,615 B | 23 |

## Release note

The README points to the stable Releases index. At validation time GitHub still reports
`v1.0.0` as the latest release, so publishing the four `v2.0.0` archives remains a
separate release action after this PR is accepted.

## Known follow-ups

- Vite emits a non-blocking future config-loader warning for the root and Mieyun Vitest configs.
- The automated release gates are green; the qualitative design gaps recorded in
  `.agent_workspace/ROUND2_BRIEF.md` remain visible for later balancing and terminology work.
