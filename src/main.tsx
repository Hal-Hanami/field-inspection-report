import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { RepositoryProvider } from './data/RepositoryProvider';
import { createMemoryRepository } from './data/memoryRepository';
import { t } from './i18n/t';
import './index.css';

document.title = t('app.title');

/** The one place that picks an adapter (DESIGN §3.3). Swapping it is a one-line change. */
const repository = createMemoryRepository();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RepositoryProvider repository={repository}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </RepositoryProvider>
  </StrictMode>,
);
