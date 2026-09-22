import { copyFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';

/**
 * A static host has no router: it looks for a file at the path in the URL. Serving the
 * application shell as the not-found page is what lets /reports/new survive a reload or
 * a link opened on a phone.
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-fallback',
    apply: 'build',
    closeBundle() {
      copyFileSync('dist/index.html', 'dist/404.html');
    },
  };
}

export default defineConfig({
  // The site is served from a subdirectory, so assets are referenced relative to it.
  base: '/field-inspection-report/',
  plugins: [react(), spaFallback()],
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
