import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      // Composition roots and barrels hold no branch a test can pin down.
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/index.ts', 'src/**/*.d.ts'],
      // A floor, not a target. What it forbids is a module nobody tested.
      thresholds: { lines: 85, functions: 85, branches: 85, statements: 85 },
    },
  },
});
