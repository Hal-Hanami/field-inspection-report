import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { RepositoryProvider } from '../../../data/RepositoryProvider';
import { createMemoryRepository } from '../../../data/memoryRepository';
import { makeReport } from '../../../test/fixtures';
import { useReports } from '../useReports';

const reports = [
  makeReport({ id: 'RPT-0001', inspectedAt: '2026-09-20T08:00' }),
  makeReport({ id: 'RPT-0002', inspectedAt: '2026-09-22T17:30' }),
];

function wrapper({ children }: { children: ReactNode }) {
  return (
    <RepositoryProvider repository={createMemoryRepository({ reports })}>
      {children}
    </RepositoryProvider>
  );
}

describe('useReports (DESIGN §3.5)', () => {
  it('§3.5: holds the screen state, so the component only renders', async () => {
    const { result } = renderHook(() => useReports(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.reports).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.reports.map((report) => report.id)).toEqual(['RPT-0002', 'RPT-0001']);
  });

  it('§3.3: a screen without a provider fails loudly instead of rendering empty', () => {
    expect(() => renderHook(() => useReports())).toThrow(/RepositoryProvider/);
  });
});
