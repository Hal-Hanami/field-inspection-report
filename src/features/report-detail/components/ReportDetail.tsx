import { SeverityBadge } from '../../../components/SeverityBadge';
import { CHECK_ITEMS, severityOf, type InspectionReport } from '../../../domain';
import { formatDateTime, formatInstant } from '../../../i18n/format';
import { checkItemKey, equipmentTypeKey, t } from '../../../i18n/t';
import styles from './ReportDetail.module.css';

export function ReportDetail({ report }: { report: InspectionReport }) {
  const severity = severityOf(report.checks);

  return (
    <div className={styles.detail} data-severity={severity}>
      <dl className={styles.fields}>
        <dt>{t('detail.severity')}</dt>
        <dd>
          <SeverityBadge result={severity} />
        </dd>
        <dt>{t('list.column.equipment')}</dt>
        <dd className={styles.code}>{report.equipmentId}</dd>
        <dt>{t('list.column.type')}</dt>
        <dd>{t(equipmentTypeKey(report.equipmentType))}</dd>
        <dt>{t('list.column.inspectedAt')}</dt>
        <dd className={styles.code}>{formatDateTime(report.inspectedAt)}</dd>
        <dt>{t('list.column.inspector')}</dt>
        <dd>{report.inspectorName}</dd>
        <dt>{t('detail.submittedAt')}</dt>
        <dd className={styles.code}>{formatInstant(report.submittedAt)}</dd>
        <dt>{t('list.column.remarks')}</dt>
        <dd className={styles.remarks}>
          {report.remarks || <span className={styles.none}>{t('list.remarks.none')}</span>}
        </dd>
      </dl>

      <h3 className={styles.checksTitle}>{t('detail.checks')}</h3>
      <table className={styles.checks}>
        <caption className={styles.caption}>{t('detail.checks.caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('detail.checks.item')}</th>
            <th scope="col">{t('detail.checks.result')}</th>
          </tr>
        </thead>
        <tbody>
          {CHECK_ITEMS.map((item) => (
            <tr key={item} data-result={report.checks[item]}>
              <th scope="row">{t(checkItemKey(item))}</th>
              <td>
                <SeverityBadge result={report.checks[item]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
