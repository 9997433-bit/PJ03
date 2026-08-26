#!/usr/bin/env node

import { access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const games = [
  { id: 'mortal', directory: rootDir },
  { id: 'lanke', directory: path.join(rootDir, 'games', 'lanke-qiyuan') },
  { id: 'mieyun', directory: path.join(rootDir, 'games', 'mieyun-tulu') },
  { id: 'daojun', directory: path.join(rootDir, 'games', 'dao-jun') },
];

if (process.argv.includes('--help')) {
  console.log(`Usage: node scripts/validate-exports.mjs

Check that every game has produced an out/index.html static entry point.`);
  process.exit(0);
}

if (process.argv.length > 2) {
  console.error(`Unknown argument(s): ${process.argv.slice(2).join(', ')}`);
  process.exit(2);
}

let missing = 0;
for (const game of games) {
  const entryPoint = path.join(game.directory, 'out', 'index.html');
  try {
    await access(entryPoint);
    console.log(`[ok]      ${game.id.padEnd(7)} ${path.relative(rootDir, entryPoint)}`);
  } catch {
    console.error(`[missing] ${game.id.padEnd(7)} ${path.relative(rootDir, entryPoint)}`);
    missing += 1;
  }
}

console.log(`\nExport summary: ${games.length - missing} valid, ${missing} missing.`);
if (missing > 0) {
  process.exitCode = 1;
}
