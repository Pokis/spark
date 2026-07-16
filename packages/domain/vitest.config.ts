import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      thresholds: {
        statements: 98,
        branches: 90,
        functions: 100,
        lines: 98
      }
    }
  }
});
