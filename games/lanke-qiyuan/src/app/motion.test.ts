/**
 * motion.test.ts — G7 的动效降级契约
 *
 * 主题里每一处动效都是装饰:落子涟漪、竹影、纸页与光标。开了
 * `prefers-reduced-motion` 的读者不该看见其中任何一样,而这件事只写在 CSS 里,
 * 没有任何类型能替它把关。这里守两条:兜底规则必须在(新加的动画自动被它罩住),
 * 逐字显示必须自己监听同一条媒体查询(CSS 管不到 JS 里的 setInterval)。
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const here = path.dirname(new URL(import.meta.url).pathname);
const css = readFileSync(path.join(here, 'globals.css'), 'utf8');
const typewriter = readFileSync(
  path.join(here, '..', 'components', 'game', 'Typewriter.tsx'),
  'utf8',
);

/** The `@media (prefers-reduced-motion: reduce)` block, braces balanced. */
function reducedMotionBlock(source: string): string {
  const start = source.indexOf('@media (prefers-reduced-motion: reduce)');
  expect(start, 'globals.css has no reduced-motion block at all').toBeGreaterThan(-1);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unbalanced braces in the reduced-motion block');
}

describe('无障碍 · prefers-reduced-motion', () => {
  const block = reducedMotionBlock(css);

  it('catches every animation with a blanket rule, so new ones opt out by default', () => {
    expect(block).toMatch(/\*\s*,\s*\*::before\s*,\s*\*::after/);
    expect(block).toMatch(/animation-duration:\s*0\.0*1ms\s*!important/);
    expect(block).toMatch(/animation-iteration-count:\s*1\s*!important/);
    expect(block).toMatch(/transition-duration:\s*0\.0*1ms\s*!important/);
  });

  it('stops the looping decorations by name as well', () => {
    for (const selector of ['.bamboo-field', '.stone-black', '.stone-white', '.caret::after']) {
      expect(block, `${selector} keeps moving`).toContain(selector);
    }
    expect(block).toMatch(/animation:\s*none\s*!important/);
  });

  it('leaves no animated element outside the query', () => {
    // Every `animation:` shorthand in the sheet must name a keyframe the sheet
    // also defines — a typo'd name is invisible motion nobody can disable.
    const used = [...css.matchAll(/animation:\s*var\(--animate-([a-z-]+)\)/g)].map((m) => m[1]!);
    for (const name of used) {
      expect(css, `--animate-${name} has no @keyframes`).toContain(`@keyframes ${name}`);
    }
    expect(used.length).toBeGreaterThan(0);
  });

  it('hands the typewriter the same switch, since CSS cannot reach setInterval', () => {
    expect(typewriter).toContain("'(prefers-reduced-motion: reduce)'");
    expect(typewriter).toMatch(/if\s*\(reduced\)\s*return;/);
    expect(typewriter).toMatch(/setShown\(reduced \? text\.length : 0\)/);
  });
});
