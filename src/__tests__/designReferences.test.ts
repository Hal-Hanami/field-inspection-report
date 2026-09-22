import { describe, expect, it } from 'vitest';
import { citedSections, designSections } from '../test/repoScan';

/**
 * A specification nobody enforces is worse than none: it reads like a guarantee. This
 * gate fails when DESIGN.md gains a section that no test cites, or cites one that the
 * document no longer defines.
 */
describe('design references', () => {
  const defined = designSections();
  const cited = citedSections();

  it('defines sections to enforce', () => {
    expect(defined.length).toBeGreaterThan(20);
  });

  it('has a test behind every section it defines', () => {
    const unenforced = defined.filter((id) => !cited.has(id));
    expect(unenforced).toEqual([]);
  });

  it('cites no section the design does not define', () => {
    const known = new Set(defined);
    const dangling = [...cited].filter((id) => !known.has(id));
    expect(dangling).toEqual([]);
  });
});
