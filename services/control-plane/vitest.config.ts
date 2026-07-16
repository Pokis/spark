import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/app.ts'],
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 95,
        lines: 85
      }
    }
  }
});
