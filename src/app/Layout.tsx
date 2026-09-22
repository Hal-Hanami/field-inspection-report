import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { t } from '../i18n/t';
import styles from './Layout.module.css';

/**
 * The frame both screens share. The notice is part of the product, not decoration: it
 * states in the UI what the repository cannot do (DESIGN §3.4) so that nobody has to
 * discover it by losing a report.
 */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        {t('app.skipToContent')}
      </a>

      <header className={styles.header}>
        <h1 className={styles.title}>{t('app.title')}</h1>
        <nav className={styles.nav} aria-label={t('app.title')}>
          <NavLink to="/reports" className={styles.navLink}>
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

      <footer className={styles.footer}>
        <h2 className={styles.noticeTitle}>{t('app.notice.title')}</h2>
        <p className={styles.noticeBody}>{t('app.notice.body')}</p>
      </footer>
    </div>
  );
}
