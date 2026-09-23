import { Link } from 'react-router-dom';
import { severityOf, type InspectionReport } from '../../../domain';
import { formatDateTime } from '../../../i18n/format';
import { equipmentTypeKey, t } from '../../../i18n/t';
import { SeverityBadge } from '../../../components/SeverityBadge';
import styles from './ReportTable.module.css';

/**
 * One semantic table at every width (DESIGN §4.3). Below 768px CSS restacks each row
 * into a card; no JavaScript measures the viewport, so there is no layout state that can
 * disagree with what is on screen.
 */
export function ReportTable({ reports }: { reports: InspectionReport[] }) {
  return (
    <table className={styles.table}>
      <caption className={styles.caption}>{t('list.caption')}</caption>
      <thead className={styles.head}>
        <tr>
          <th scope="col">{t('list.column.id')}</th>
          <th scope="col">{t('list.column.equipment')}</th>
          <th scope="col">{t('list.column.type')}</th>
          <th scope="col">{t('list.column.inspectedAt')}</th>
          <th scope="col">{t('list.column.inspector')}</th>
          <th scope="col">{t('list.column.severity')}</th>
          <th scope="col">{t('list.column.remarks')}</th>
        </tr>
      </thead>
      <tbody>
        {reports.map((report) => {
          const severity = severityOf(report.checks);
          return (
            // The row repeats the severity so that CSS can tint abnormal rows; the badge
            // stays the accessible signal (DESIGN §4.5).
            <tr key={report.id} className={styles.row} data-severity={severity}>
              <th scope="row" className={styles.rowHeader} data-label={t('list.column.id')}>
                <Link to={`/reports/${report.id}`} className={styles.code}>
                  {report.id}
                </Link>
              </th>
              <td data-label={t('list.column.equipment')}>
                <span className={styles.code}>{report.equipmentId}</span>
              </td>
              <td data-label={t('list.column.type')}>{t(equipmentTypeKey(report.equipmentType))}</td>
              <td data-label={t('list.column.inspectedAt')} className={styles.nowrap}>
                <span className={styles.code}>{formatDateTime(report.inspectedAt)}</span>
              </td>
              <td data-label={t('list.column.inspector')} className={styles.nowrap}>
                {report.inspectorName}
              </td>
              <td data-label={t('list.column.severity')} className={styles.severity}>
                <SeverityBadge result={severity} />
              </td>
              <td data-label={t('list.column.remarks')} className={styles.remarks}>
                {report.remarks || <span className={styles.none}>{t('list.remarks.none')}</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
