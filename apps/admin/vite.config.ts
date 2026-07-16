import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/main.tsx',
        'src/test/**'
      ],
      thresholds: {
        statements: 70,
        branches: 45,
        functions: 60,
        lines: 70
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
