import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryRepository } from '../../../data/memoryRepository';
import { CHECK_ITEMS } from '../../../domain';
import { checkItemKey, checkResultKey, t } from '../../../i18n/t';
import { makeChecks, makeReport } from '../../../test/fixtures';
import { renderApp } from '../../../test/renderApp';

const abnormal = makeReport({
  id: 'RPT-0003',
  equipmentId: 'SW-0031',
  checks: makeChecks({ temperature: 'abnormal', corrosion: 'caution' }),
  remarks: 'enclosure hot to the touch',
});

describe('report detail (DESIGN §4.1, §4.6)', () => {
  it('§4.6: the list links each report id to its detail', async () => {
    const { user } = renderApp({ repository: createMemoryRepository({ reports: [abnormal] }) });
    await user.click(await screen.findByRole('link', { name: 'RPT-0003' }));
    expect(
      await screen.findByRole('heading', { name: t('detail.title', { id: 'RPT-0003' }) }),
    ).toBeInTheDocument();
  });

  it('§4.6: shows which item failed, each with its own result', async () => {
    renderApp({
      route: '/reports/RPT-0003',
      repository: createMemoryRepository({ reports: [abnormal] }),
    });
    const table = await screen.findByRole('table', { name: t('detail.checks.caption') });
    for (const item of CHECK_ITEMS) {
      const row = within(table).getByRole('rowheader', { name: t(checkItemKey(item)) })
        .parentElement as HTMLElement;
      expect(within(row).getByText(t(checkResultKey(abnormal.checks[item])))).toBeInTheDocument();
    }
    expect(screen.getByText(abnormal.remarks)).toBeInTheDocument();
  });

  it('§4.6: an unknown id says so on the page instead of redirecting', async () => {
    renderApp({ route: '/reports/RPT-0404' });
    expect(
      await screen.findByText(t('detail.notFound', { id: 'RPT-0404' })),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('detail.back') })).toHaveAttribute(
      'href',
      '/reports',
    );
  });

  it('§4.1: a report has an address of its own', async () => {
    renderApp({
      route: '/reports/RPT-0003',
      repository: createMemoryRepository({ reports: [abnormal] }),
    });
    expect(await screen.findByText('SW-0031')).toBeInTheDocument();
  });
});
