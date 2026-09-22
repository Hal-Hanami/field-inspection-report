import { severityOf, type InspectionReport } from '../../../domain';
import { formatDateTime } from '../../../i18n/format';
import { equipmentTypeKey, t } from '../../../i18n/t';
import { SeverityBadge } from './SeverityBadge';
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
        {reports.map((report) => (
          <tr key={report.id} className={styles.row}>
            <th scope="row" className={styles.rowHeader} data-label={t('list.column.id')}>
              {report.id}
            </th>
            <td data-label={t('list.column.equipment')}>{report.equipmentId}</td>
            <td data-label={t('list.column.type')}>{t(equipmentTypeKey(report.equipmentType))}</td>
            <td data-label={t('list.column.inspectedAt')}>{formatDateTime(report.inspectedAt)}</td>
            <td data-label={t('list.column.inspector')}>{report.inspectorName}</td>
            <td data-label={t('list.column.severity')}>
              <SeverityBadge result={severityOf(report.checks)} />
            </td>
            <td data-label={t('list.column.remarks')} className={styles.remarks}>
              {report.remarks || t('list.remarks.none')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
