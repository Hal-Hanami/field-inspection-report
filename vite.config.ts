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

export default defineConfig(({ mode }) => ({
  // `vite --mode server` (npm run dev) runs against the local API of DESIGN §7; any other
  // mode, the static demo build included, uses the in-memory adapter (DESIGN §3.4).
  define:
    mode === 'server' ? { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') } : {},
  // The site is served from a subdirectory, so assets are referenced relative to it.
  base: '/field-inspection-report/',
  plugins: [react(), spaFallback()],
  // In development /api is the local FastAPI server, reached through this proxy so the
  // browser sees one origin and needs no CORS.
  server: {
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
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
}));
