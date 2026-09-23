import { Link, useParams } from 'react-router-dom';
import { t } from '../../i18n/t';
import { ReportDetail } from './components/ReportDetail';
import { useReport } from './useReport';
import styles from './ReportDetailScreen.module.css';

/**
 * Which item was abnormal, not only that something was (DESIGN §4.6). An unknown id is
 * said on the page rather than redirected away, so a mistyped link is noticed.
 */
export function ReportDetailScreen() {
  const { id = '' } = useParams();
  const state = useReport(id);

  return (
    <section aria-labelledby="detail-title">
      <p className={styles.back}>
        <Link to="/reports">{t('detail.back')}</Link>
      </p>
      <h2 id="detail-title" className={styles.title}>
        {t('detail.title', { id })}
      </h2>
      {state.loading ? <p className={styles.state}>{t('list.loading')}</p> : null}
      {state.failed ? (
        <p role="alert" className={styles.state}>
          {t('list.loadFailed')}
        </p>
      ) : null}
      {!state.loading && !state.failed && state.report === null ? (
        <p className={styles.state}>{t('detail.notFound', { id })}</p>
      ) : null}
      {!state.loading && !state.failed && state.report ? (
        <ReportDetail report={state.report} />
      ) : null}
    </section>
  );
}
