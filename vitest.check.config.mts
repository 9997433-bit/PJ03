import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve('/workspace', 'src') },
  },
  test: {
    include: [
      'src/engine/__tests__/turn.test.ts',
      'src/engine/__tests__/breakthrough.test.ts',
      'src/engine/__tests__/creation.test.ts',
    ],
    environment: 'node',
  },
});
