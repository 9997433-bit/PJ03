import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts']),
  {
    // 弈者不容私掷: every random outcome must flow through the audited gateway.
    files: ['src/engine/**/*.ts', 'src/data/**/*.ts', 'src/store/**/*.ts'],
    ignores: ['src/engine/rng.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: '枰上无侥幸 — use the audited dice engine in src/engine/rng.ts instead.',
        },
      ],
    },
  },
]);

export default eslintConfig;
