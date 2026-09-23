import { describe, expect, it } from 'vitest';
import { read } from '../test/repoScan';

/**
 * DESIGN §3.4. Which adapter a session runs on is invisible on screen, so the default
 * has to be the one that keeps what is filed. This pins the defaults where they live.
 */
const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> })
  .scripts;

describe('development defaults (DESIGN §3.4)', () => {
  it('§3.4: `npm run dev` runs against the server', () => {
    expect(scripts['dev']).toBe('vite --mode server');
    expect(read('vite.config.ts')).toMatch(/mode === 'server'/);
  });

  it('§3.4: the in-memory adapter is reached only on purpose, and the public build uses it', () => {
    expect(scripts['dev:demo']).toBe('vite');
    expect(scripts['build']).not.toMatch(/--mode server/);
  });
});
