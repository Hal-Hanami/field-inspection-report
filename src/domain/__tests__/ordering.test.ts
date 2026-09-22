import { describe, expect, it } from 'vitest';
import { sortByInspectedAtDesc } from '../ordering';
import { makeReport } from '../../test/fixtures';

describe('ordering (DESIGN §4.2)', () => {
  it('§4.2: puts the newest inspection first', () => {
    const older = makeReport({ id: 'RPT-0001', inspectedAt: '2026-09-20T08:00' });
    const newer = makeReport({ id: 'RPT-0002', inspectedAt: '2026-09-22T17:30' });
    expect(sortByInspectedAtDesc([older, newer]).map((report) => report.id)).toEqual([
      'RPT-0002',
      'RPT-0001',
    ]);
  });

  it('§4.2: leaves the caller list untouched', () => {
    const reports = [
      makeReport({ id: 'RPT-0001', inspectedAt: '2026-09-20T08:00' }),
      makeReport({ id: 'RPT-0002', inspectedAt: '2026-09-22T17:30' }),
    ];
    sortByInspectedAtDesc(reports);
    expect(reports.map((report) => report.id)).toEqual(['RPT-0001', 'RPT-0002']);
  });
});
