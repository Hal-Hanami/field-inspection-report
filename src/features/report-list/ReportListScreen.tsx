import { useLocation } from 'react-router-dom';
import { t } from '../../i18n/t';
import { ReportTable } from './components/ReportTable';
import { useReports } from './useReports';
import styles from './ReportListScreen.module.css';

/** What the office sees (DESIGN §4.2): newest first, with the report just filed on top. */
export function ReportListScreen() {
  const { reports, loading } = useReports();
  const location = useLocation();
  const savedId = (location.state as { savedId?: string } | null)?.savedId;

  return (
    <section aria-labelledby="list-title">
      <h2 id="list-title" className={styles.title}>{t('list.title')}</h2>

      {savedId ? (
        // <output> is announced like a status message without stealing focus from the
        // list, and needs no role attribute to say so.
        <output className={styles.flash}>{t('list.saved', { id: savedId })}</output>
      ) : null}

      {loading ? <p className={styles.state}>{t('list.loading')}</p> : null}

      {!loading && reports.length === 0 ? (
        <p className={styles.state}>{t('list.empty')}</p>
      ) : null}

      {!loading && reports.length > 0 ? (
        <>
          <p className={styles.count}>{t('list.count', { count: reports.length })}</p>
          <ReportTable reports={reports} />
        </>
      ) : null}
    </section>
  );
}
