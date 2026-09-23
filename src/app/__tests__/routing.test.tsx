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

  it.each([
    ['/reports', 'app.nav.list', 'app.nav.new'],
    ['/reports/new', 'app.nav.new', 'app.nav.list'],
  ] as const)('§4.1: on %s only the current screen is marked current', (route, current, other) => {
    renderApp({ route });
    expect(screen.getByRole('link', { name: t(current) })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: t(other) })).not.toHaveAttribute('aria-current');
  });
});
