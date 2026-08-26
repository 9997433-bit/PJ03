#!/usr/bin/env node
import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'out');
const checks = [];

async function check(label, test) {
  try {
    const detail = await test();
    checks.push({ label, ok: true, detail });
  } catch (error) {
    checks.push({ label, ok: false, detail: error instanceof Error ? error.message : String(error) });
  }
}

await check('out/index.html exists', async () => {
  const file = path.join(output, 'index.html');
  await access(file);
  const info = await stat(file);
  if (info.size < 1000) throw new Error(`unexpectedly small HTML (${info.size} bytes)`);
  return `${info.size} bytes`;
});

await check('document metadata is exported', async () => {
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  if (!html.includes('道君')) throw new Error('title text is absent');
  if (!html.includes('人生模拟器')) throw new Error('game name is absent');
  if (!html.includes('viewport')) throw new Error('viewport metadata is absent');
  return 'title, description, and viewport present';
});

await check('client JavaScript bundles exist', async () => {
  const chunks = path.join(output, '_next', 'static', 'chunks');
  const files = (await readdir(chunks)).filter((file) => file.endsWith('.js'));
  if (files.length < 2) throw new Error(`only ${files.length} JavaScript bundle(s)`);
  return `${files.length} JavaScript bundles`;
});

await check('stylesheets are emitted', async () => {
  const chunks = path.join(output, '_next', 'static', 'chunks');
  const files = (await readdir(chunks)).filter((file) => file.endsWith('.css'));
  if (files.length < 1) throw new Error('no CSS bundle found');
  return `${files.length} CSS bundle(s)`;
});

await check('404 fallback is static', async () => {
  await access(path.join(output, '404.html'));
  return '404.html present';
});

for (const result of checks) {
  console.log(`[smoke] ${result.ok ? 'PASS' : 'FAIL'} ${result.label} — ${result.detail}`);
}

const failures = checks.filter((result) => !result.ok);
if (failures.length) {
  console.error(`[smoke] ${failures.length}/${checks.length} checks failed`);
  process.exit(1);
}
console.log(`[smoke] PASS ${checks.length}/${checks.length} static-export checks`);
