import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('monorepo tooling', () => {
  it('declares game workspaces and root orchestration commands', () => {
    const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    const tsconfig = JSON.parse(readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8'));

    expect(packageJson.workspaces).toContain('games/*');
    expect(packageJson.scripts).toMatchObject({
      'build:all': 'bash scripts/build-all.sh',
      'test:all': 'bash scripts/test-all.sh',
      'package:all': 'bash scripts/package-all.sh',
      'validate:exports': 'node scripts/validate-exports.mjs',
      benchmark: 'node scripts/benchmark.mjs',
    });
    expect(tsconfig.exclude).toContain('games');
  });

  it.each(['build-all.sh', 'test-all.sh', 'package-all.sh'])(
    '%s has valid Bash syntax',
    (script) => {
      const result = spawnSync('bash', ['-n', path.join(rootDir, 'scripts', script)], {
        encoding: 'utf8',
      });

      expect(result.status, result.stderr).toBe(0);
    },
  );

  it('loads the benchmark command without running builds', () => {
    const result = spawnSync(
      process.execPath,
      [path.join(rootDir, 'scripts', 'benchmark.mjs'), '--help'],
      { encoding: 'utf8' },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('--no-build');
    expect(result.stdout).toContain('--output');
  });

  it('loads the export validator without checking artifacts', () => {
    const result = spawnSync(
      process.execPath,
      [path.join(rootDir, 'scripts', 'validate-exports.mjs'), '--help'],
      { encoding: 'utf8' },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('out/index.html');
  });

  it('registers all game directories in each orchestrator', () => {
    const tooling = [
      'build-all.sh',
      'test-all.sh',
      'package-all.sh',
      'benchmark.mjs',
      'validate-exports.mjs',
    ].map((script) => readFileSync(path.join(rootDir, 'scripts', script), 'utf8'));

    for (const gameDirectory of ['lanke-qiyuan', 'mieyun-tulu', 'dao-jun']) {
      for (const source of tooling) {
        expect(source).toContain(gameDirectory);
      }
    }

    for (const source of [tooling[0], tooling[2], tooling[3]]) {
      expect(source).toContain('index.html');
    }
  });
});
