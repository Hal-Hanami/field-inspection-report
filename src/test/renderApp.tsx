import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../app/App';
import type { InspectionRepository } from '../data/InspectionRepository';
import { RepositoryProvider } from '../data/RepositoryProvider';
import { createMemoryRepository } from '../data/memoryRepository';

/**
 * Renders the whole application against a repository the test controls (DESIGN §3.3),
 * so a screen test states the data it is about instead of working around the seed.
 */
export function renderApp(
  options: { repository?: InspectionRepository; route?: string } = {},
) {
  const repository = options.repository ?? createMemoryRepository({ reports: [] });
  const user = userEvent.setup();
  render(
    <RepositoryProvider repository={repository}>
      <MemoryRouter initialEntries={[options.route ?? '/reports']}>
        <App />
      </MemoryRouter>
    </RepositoryProvider>,
  );
  return { repository, user };
}
