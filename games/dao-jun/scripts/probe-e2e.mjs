#!/usr/bin/env node
import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'out');
const checks = [];

async function check(label, run) {
  try {
    const detail = await run();
    checks.push({ label, ok: true, detail });
  } catch (error) {
    checks.push({ label, ok: false, detail: error instanceof Error ? error.message : String(error) });
  }
}

await check('out/index.html exists', async () => {
  const file = path.join(output, 'index.html');
  await access(file);
  const info = await stat(file);
  if (info.size < 1000) throw new Error(`HTML is unexpectedly small (${info.size} bytes)`);
  return `${info.size} bytes`;
});

await check('key engine exports resolve through the barrel', async () => {
  const engineDir = path.join(root, 'engine');
  const barrel = await readFile(path.join(engineDir, 'index.ts'), 'utf8');
  const moduleNames = [...barrel.matchAll(/export \* from ['"]\.\/([^'"]+)['"]/g)].map((match) => match[1]);
  const declarations = new Set();
  for (const moduleName of moduleNames) {
    const source = await readFile(path.join(engineDir, `${moduleName}.ts`), 'utf8');
    for (const match of source.matchAll(/export\s+(?:const|function|class|interface|type)\s+([A-Za-z0-9_]+)/g)) {
      declarations.add(match[1]);
    }
  }
  const expected = [
    'EVENTS',
    'ITEMS',
    'ENDINGS',
    'createCreationState',
    'advanceCreation',
    'createGame',
    'performAction',
    'chooseEvent',
    'createDaoPattern',
    'createSoul',
    'createTerritory',
  ];
  const missing = expected.filter((name) => !declarations.has(name));
  if (missing.length) throw new Error(`missing exports: ${missing.join(', ')}`);
  return `${expected.length}/${expected.length}: ${expected.join(', ')}`;
});

await check('built client contains the unique save key', async () => {
  const chunksDir = path.join(output, '_next', 'static', 'chunks');
  const files = (await readdir(chunksDir)).filter((file) => file.endsWith('.js'));
  const bundles = (await Promise.all(files.map((file) => readFile(path.join(chunksDir, file), 'utf8')))).join('\n');
  if (!bundles.includes('daojun_save_v1')) throw new Error('daojun_save_v1 is absent from client bundles');
  if (bundles.includes('dao-jun-life-v1')) throw new Error('legacy save key remains in client bundles');
  return `daojun_save_v1 in ${files.length} JavaScript bundles`;
});

await check('four-step creation ships end-to-end', async () => {
  const chunksDir = path.join(output, '_next', 'static', 'chunks');
  const files = (await readdir(chunksDir)).filter((file) => file.endsWith('.js'));
  const bundles = (await Promise.all(files.map((file) => readFile(path.join(chunksDir, file), 'utf8')))).join('\n');
  const markers = ['留名', '问身', '择途', '立誓', '引雷入道'];
  const missing = markers.filter((marker) => !bundles.includes(marker));
  if (missing.length) throw new Error(`missing creation markers: ${missing.join(', ')}`);
  return `4/4 steps and completion action present`;
});

await check('content catalogs meet release thresholds', async () => {
  const source = await readFile(path.join(root, 'engine', 'content.ts'), 'utf8');
  const events = (source.match(/^\s*event\('/gm) ?? []).length;
  const itemsBlock = source.slice(source.indexOf('export const ITEMS'), source.indexOf('export const ENDINGS'));
  const endingsBlock = source.slice(source.indexOf('export const ENDINGS'), source.indexOf('export const ORIGINS'));
  const items = (itemsBlock.match(/^\s*\{ id:/gm) ?? []).length;
  const endings = (endingsBlock.match(/^\s*\{ id:/gm) ?? []).length;
  if (events < 30 || items < 20 || endings < 10) {
    throw new Error(`catalog too small: ${events} events, ${items} items, ${endings} endings`);
  }
  return `${events} events, ${items} items, ${endings} endings`;
});

for (const result of checks) {
  console.log(`[probe-e2e] ${result.ok ? 'PASS' : 'FAIL'} ${result.label} — ${result.detail}`);
}

const failures = checks.filter((result) => !result.ok);
if (failures.length) {
  console.error(`[probe-e2e] ${failures.length}/${checks.length} checks failed`);
  process.exit(1);
}
console.log(`[probe-e2e] PASS ${checks.length}/${checks.length} end-to-end artifact checks`);
