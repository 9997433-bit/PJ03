#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = path.join(rootDir, 'dist', 'benchmark.json');
const shouldBuild = !process.argv.includes('--no-build');
const validArguments = new Set(['--no-build', '--help']);
const unknownArguments = process.argv.slice(2).filter((argument) => !validArguments.has(argument));

if (process.argv.includes('--help')) {
  console.log(`Usage: node scripts/benchmark.mjs [--no-build]

Build every available game and measure build duration plus static export size.
Use --no-build to measure existing out/ directories without rebuilding.`);
  process.exit(0);
}

if (unknownArguments.length > 0) {
  console.error(`Unknown argument(s): ${unknownArguments.join(', ')}`);
  process.exit(2);
}

const games = [
  { id: 'mortal', directory: rootDir },
  { id: 'lanke', directory: path.join(rootDir, 'games', 'lanke-qiyuan') },
  { id: 'mieyun', directory: path.join(rootDir, 'games', 'mieyun-tulu') },
  { id: 'daojun', directory: path.join(rootDir, 'games', 'dao-jun') },
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function measureDirectory(directory) {
  let bytes = 0;
  let files = 0;

  async function visit(currentDirectory) {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(currentDirectory, entry.name);
        if (entry.isDirectory()) {
          await visit(entryPath);
        } else if (entry.isFile()) {
          const metadata = await stat(entryPath);
          bytes += metadata.size;
          files += 1;
        }
      }),
    );
  }

  await visit(directory);
  return { bytes, files };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
}

async function benchmarkGame(game) {
  const packagePath = path.join(game.directory, 'package.json');
  if (!(await exists(packagePath))) {
    return {
      id: game.id,
      status: 'skipped',
      reason: `package not found: ${path.relative(rootDir, packagePath)}`,
      buildSeconds: null,
      bytes: null,
      files: null,
    };
  }

  let buildSeconds = null;
  try {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
    if (shouldBuild) {
      if (!packageJson.scripts?.build) {
        throw new Error('package has no npm build script');
      }

      console.log(`\n[benchmark] building ${game.id}`);
      const startedAt = performance.now();
      const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const result = spawnSync(npmExecutable, ['run', 'build'], {
        cwd: game.directory,
        env: process.env,
        stdio: 'inherit',
      });
      buildSeconds = Number(((performance.now() - startedAt) / 1000).toFixed(3));

      if (result.error) throw result.error;
      if (result.status !== 0) {
        throw new Error(
          result.signal
            ? `build terminated by ${result.signal}`
            : `build exited with status ${result.status}`,
        );
      }
    }

    const outDirectory = path.join(game.directory, 'out');
    const entryPoint = path.join(outDirectory, 'index.html');
    if (!(await exists(entryPoint))) {
      throw new Error(`static entry point not found: ${path.relative(rootDir, entryPoint)}`);
    }

    const metrics = await measureDirectory(outDirectory);
    return {
      id: game.id,
      status: 'ok',
      buildSeconds,
      bytes: metrics.bytes,
      files: metrics.files,
    };
  } catch (error) {
    return {
      id: game.id,
      status: 'failed',
      reason: error instanceof Error ? error.message : String(error),
      buildSeconds,
      bytes: null,
      files: null,
    };
  }
}

const results = [];
for (const game of games) {
  results.push(await benchmarkGame(game));
}

const report = {
  generatedAt: new Date().toISOString(),
  buildsExecuted: shouldBuild,
  environment: {
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
  },
  games: results,
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('');
console.table(
  results.map((result) => ({
    game: result.id,
    status: result.status,
    'build (s)': result.buildSeconds ?? '—',
    files: result.files ?? '—',
    size: result.bytes === null ? '—' : formatBytes(result.bytes),
    note: result.reason ?? '',
  })),
);
console.log(`Report: ${path.relative(rootDir, reportPath)}`);

if (results.some((result) => result.status === 'failed')) {
  process.exitCode = 1;
}
