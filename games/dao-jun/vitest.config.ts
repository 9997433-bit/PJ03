import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['engine/**/*.test.ts'],
    coverage: { include: ['engine/**/*.ts'], exclude: ['engine/**/*.test.ts'] },
  },
});
