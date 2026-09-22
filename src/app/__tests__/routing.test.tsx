import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '../../i18n/t';
import { renderApp } from '../../test/renderApp';

describe('routing (DESIGN §4.1)', () => {
  it('§4.1: /reports shows the list', async () => {
    renderApp({ route: '/reports' });
    expect(await screen.findByRole('heading', { name: t('list.title') })).toBeInTheDocument();
  });

  it('§4.1: /reports/new shows the form', () => {
    renderApp({ route: '/reports/new' });
    expect(screen.getByRole('heading', { name: t('form.title') })).toBeInTheDocument();
  });

  it('§4.1: an unknown path lands on the list rather than on nothing', async () => {
    renderApp({ route: '/nowhere' });
    expect(await screen.findByRole('heading', { name: t('list.title') })).toBeInTheDocument();
  });

  it('§4.1: both screens are reachable from the frame', () => {
    renderApp({ route: '/reports' });
    expect(screen.getByRole('link', { name: t('app.nav.list') })).toHaveAttribute(
      'href',
      '/reports',
    );
    expect(screen.getByRole('link', { name: t('app.nav.new') })).toHaveAttribute(
      'href',
      '/reports/new',
    );
  });
});
