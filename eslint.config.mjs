import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['node_modules/**', '.next/**', 'out/**'],
  },
  {
    // Anti-cheat layer 1: all randomness must flow through the audited dice
    // engine in src/engine/rng.ts — Math.random is forbidden everywhere else.
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/engine/rng.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: '天道不容私掷。All randomness must go through src/engine/rng.ts.',
        },
      ],
    },
  },
];

export default eslintConfig;
