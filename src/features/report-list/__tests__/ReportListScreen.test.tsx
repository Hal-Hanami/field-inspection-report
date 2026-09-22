import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryRepository } from '../../../data/memoryRepository';
import { checkResultKey, t } from '../../../i18n/t';
import { makeChecks, makeReport } from '../../../test/fixtures';
import { renderApp } from '../../../test/renderApp';

const reports = [
  makeReport({ id: 'RPT-0001', equipmentId: 'TR-0142', inspectedAt: '2026-09-20T08:00' }),
  makeReport({
    id: 'RPT-0002',
    equipmentId: 'SW-0031',
    inspectedAt: '2026-09-22T17:30',
    checks: makeChecks({ appearance: 'abnormal' }),
    remarks: 'deformed enclosure',
  }),
];

describe('report list (DESIGN §4.2, §4.3, §4.5)', () => {
  it('§4.3: renders one semantic table, so office and field read the same content', async () => {
    renderApp({ repository: createMemoryRepository({ reports }) });
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(reports.length + 1);
    expect(within(table).getByRole('columnheader', { name: t('list.column.severity') }))
      .toBeInTheDocument();
  });

  it('§4.2: shows the newest inspection first', async () => {
    renderApp({ repository: createMemoryRepository({ reports }) });
    const table = await screen.findByRole('table');
    const rowHeaders = within(table).getAllByRole('rowheader');
    expect(rowHeaders.map((cell) => cell.textContent)).toEqual(['RPT-0002', 'RPT-0001']);
  });

  it('§4.5: states severity in words, not by colour alone', async () => {
    renderApp({ repository: createMemoryRepository({ reports }) });
    const table = await screen.findByRole('table');
    expect(within(table).getByText(t(checkResultKey('abnormal')))).toBeInTheDocument();
    expect(within(table).getByText(t(checkResultKey('ok')))).toBeInTheDocument();
  });

  it('§4.2: says how many reports are shown', async () => {
    renderApp({ repository: createMemoryRepository({ reports }) });
    expect(await screen.findByText(t('list.count', { count: 2 }))).toBeInTheDocument();
  });

  it('§4.2: says so plainly when there is nothing to show', async () => {
    renderApp({ repository: createMemoryRepository({ reports: [] }) });
    expect(await screen.findByText(t('list.empty'))).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('§3.4: states in the UI that nothing is stored', async () => {
    renderApp({ repository: createMemoryRepository({ reports: [] }) });
    expect(screen.getByText(t('app.notice.body'))).toBeInTheDocument();
  });
});
