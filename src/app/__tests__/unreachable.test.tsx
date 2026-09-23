import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { InspectionRepository } from '../../data/InspectionRepository';
import { t } from '../../i18n/t';
import { renderApp } from '../../test/renderApp';

/** DESIGN §4.7: a server that cannot be reached is reported, not waited for forever. */

const unreachable: InspectionRepository = {
  persistent: true,
  list: async () => {
    throw new TypeError('Failed to fetch');
  },
  get: async () => {
    throw new TypeError('Failed to fetch');
  },
  save: async () => {
    throw new TypeError('Failed to fetch');
  },
};

describe('an unreachable repository (DESIGN §4.7)', () => {
  it('§4.7: the list says it could not load, and stops saying it is loading', async () => {
    renderApp({ route: '/reports', repository: unreachable });
    expect(await screen.findByRole('alert')).toHaveTextContent(t('list.loadFailed'));
    expect(screen.queryByText(t('list.loading'))).not.toBeInTheDocument();
    expect(screen.queryByText(t('list.empty'))).not.toBeInTheDocument();
  });

  it('§4.7: the detail says it could not load, rather than that the report does not exist', async () => {
    renderApp({ route: '/reports/RPT-0001', repository: unreachable });
    expect(await screen.findByRole('alert')).toHaveTextContent(t('list.loadFailed'));
    expect(screen.queryByText(t('list.loading'))).not.toBeInTheDocument();
    expect(
      screen.queryByText(t('detail.notFound', { id: 'RPT-0001' })),
    ).not.toBeInTheDocument();
  });
});
