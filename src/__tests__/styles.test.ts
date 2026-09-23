import { describe, expect, it } from 'vitest';
import { read, trackedFiles } from '../test/repoScan';

/**
 * The responsive and target-size rules of DESIGN §4.3, §4.4 and §5.4 live in CSS, so
 * this is where they are checked. A rendered snapshot in jsdom cannot see a media query.
 */

const styleSheets = trackedFiles().filter((path) => path.startsWith('src/') && path.endsWith('.css'));

describe('responsive rules (DESIGN §4.3, §4.4, §5.4)', () => {
  it('§4.4: every media query adds to the phone layout, never undoes it', () => {
    const backwards = styleSheets.filter((path) => /@media[^{]*max-width/.test(read(path)));
    expect(backwards).toEqual([]);
  });

  it('§4.3: the list changes shape in CSS, not in JavaScript', () => {
    const table = read('src/features/report-list/components/ReportTable.module.css');
    expect(table).toMatch(/@media \(min-width: 768px\)/);
    expect(table).toMatch(/content: attr\(data-label\)/);

    const source = read('src/features/report-list/components/ReportTable.tsx');
    expect(source).not.toMatch(/matchMedia|innerWidth|useMediaQuery/);
  });

  it('§5.4: the touch target size is defined once and used by the controls', () => {
    const tokens = read('src/index.css');
    expect(tokens).toMatch(/--control-min-height:\s*44px/);
    expect(tokens).toMatch(/min-height: var\(--control-min-height\)/);

    const form = read('src/features/report-form/components/ReportForm.module.css');
    expect(form).toMatch(/min-height: var\(--control-min-height\)/);
  });

  it('§4.5: severity styling adds a shape, so colour is never the only signal', () => {
    const badge = read('src/components/SeverityBadge.module.css');
    const shapes = badge.match(/content: '\\[0-9A-F]{4}'/g) ?? [];
    expect(shapes.length).toBe(3);
  });
});
