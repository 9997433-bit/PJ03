import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', 'out/**', '.next/**', 'next-env.d.ts'] },
  {
    files: ['**/*.{ts,tsx,mjs}'],
    languageOptions: { parser: tseslint.parser },
    // 天道不容私掷 — all randomness must flow through the seeded dice in engine/rng.ts.
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: '使用 engine/rng.ts 的种子化骰子，禁止 Math.random。' },
      ],
    },
  },
  { files: ['engine/rng.ts'], rules: { 'no-restricted-properties': 'off' } },
);
