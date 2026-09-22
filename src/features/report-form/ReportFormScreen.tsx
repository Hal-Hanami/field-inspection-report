import { useNavigate } from 'react-router-dom';
import { t } from '../../i18n/t';
import { ReportForm } from './components/ReportForm';
import { useReportForm } from './useReportForm';

/**
 * Filing a report ends on the list, with the new report named (DESIGN §4.2): the person
 * who filed it sees that it arrived instead of trusting that it did.
 */
export function ReportFormScreen() {
  const navigate = useNavigate();
  const { form, submit, saveError } = useReportForm({
    onSaved: (report) => navigate('/reports', { state: { savedId: report.id } }),
  });

  return (
    <section aria-labelledby="form-title">
      <h2 id="form-title">{t('form.title')}</h2>
      <p>{t('form.description')}</p>
      <ReportForm
        form={form}
        submit={submit}
        saveError={saveError}
        onCancel={() => navigate('/reports')}
      />
    </section>
  );
}
