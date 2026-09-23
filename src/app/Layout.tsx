import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { t } from '../i18n/t';
import styles from './Layout.module.css';

/** The frame every screen shares: the skip link, the title and the navigation. */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        {t('app.skipToContent')}
      </a>

      <header className={styles.header}>
        <h1 className={styles.title}>{t('app.title')}</h1>
        <nav className={styles.nav} aria-label={t('app.title')}>
          {/* `end`: without it /reports also matches /reports/new, and both links
              would claim to be the current page. */}
          <NavLink to="/reports" end className={styles.navLink}>
            {t('app.nav.list')}
          </NavLink>
          <NavLink to="/reports/new" className={styles.navLink}>
            {t('app.nav.new')}
          </NavLink>
        </nav>
      </header>

      <main id="main" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
