import { useId } from 'react';
import {
  CHECK_ITEMS,
  CHECK_RESULTS,
  EQUIPMENT_TYPES,
  REMARKS_MAX_LENGTH,
} from '../../../domain';
import { checkItemKey, checkResultKey, equipmentTypeKey, t, tMessage } from '../../../i18n/t';
import type { UseReportFormResult } from '../useReportForm';
import styles from './ReportForm.module.css';

/**
 * The field side (DESIGN §4.4): one column, large targets, and every message tied to the
 * control it belongs to (DESIGN §5.1–§5.3). The component renders and reports events; the
 * rules and the state live behind `useReportForm` (DESIGN §3.5).
 */
export function ReportForm({
  form,
  submit,
  saveError,
  onCancel,
}: UseReportFormResult & { onCancel: () => void }) {
  const {
    register,
    watch,
    formState: { errors, isSubmitting },
  } = form;
  const prefix = useId();
  const fieldId = (name: string) => `${prefix}-${name}`;
  const errorId = (name: string) => `${prefix}-${name}-error`;
  const hintId = (name: string) => `${prefix}-${name}-hint`;

  const remarksLength = watch('remarks').length;

  const summary: { id: string; label: string; message: string }[] = [
    errors.equipmentId && {
      id: fieldId('equipmentId'),
      label: t('form.field.equipmentId'),
      message: tMessage(errors.equipmentId.message ?? ''),
    },
    errors.equipmentType && {
      id: fieldId('equipmentType'),
      label: t('form.field.equipmentType'),
      message: tMessage(errors.equipmentType.message ?? ''),
    },
    errors.inspectedAt && {
      id: fieldId('inspectedAt'),
      label: t('form.field.inspectedAt'),
      message: tMessage(errors.inspectedAt.message ?? ''),
    },
    errors.inspectorName && {
      id: fieldId('inspectorName'),
      label: t('form.field.inspectorName'),
      message: tMessage(errors.inspectorName.message ?? ''),
    },
    ...CHECK_ITEMS.map((item) => {
      const error = errors.checks?.[item];
      return error
        ? {
            id: fieldId(`checks-${item}`),
            label: t(checkItemKey(item)),
            message: tMessage(error.message ?? ''),
          }
        : undefined;
    }),
    errors.remarks && {
      id: fieldId('remarks'),
      label: t('form.field.remarks'),
      message: tMessage(errors.remarks.message ?? ''),
    },
  ].filter((entry): entry is { id: string; label: string; message: string } => Boolean(entry));

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {summary.length > 0 ? (
        // §5.3 — on a phone the failing field is usually off-screen; the summary says
        // what went wrong before scrolling starts.
        <div role="alert" className={styles.summary}>
          <h3 className={styles.summaryTitle}>{t('form.errorSummary.title')}</h3>
          <ul className={styles.summaryList}>
            {summary.map((entry) => (
              <li key={entry.id}>
                <a href={`#${entry.id}`}>
                  {entry.label}: {entry.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {saveError ? (
        <p role="alert" className={styles.saveError}>
          {tMessage(saveError)}
        </p>
      ) : null}

      <div className={styles.field}>
        <label htmlFor={fieldId('equipmentId')}>
          {t('form.field.equipmentId')} <span className={styles.required}>{t('form.required')}</span>
        </label>
        <p id={hintId('equipmentId')} className={styles.hint}>
          {t('form.field.equipmentId.hint')}
        </p>
        <input
          id={fieldId('equipmentId')}
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          aria-required="true"
          aria-invalid={errors.equipmentId ? 'true' : undefined}
          aria-describedby={
            errors.equipmentId
              ? `${hintId('equipmentId')} ${errorId('equipmentId')}`
              : hintId('equipmentId')
          }
          {...register('equipmentId')}
        />
        {errors.equipmentId ? (
          <p id={errorId('equipmentId')} className={styles.error}>
            {tMessage(errors.equipmentId.message ?? '')}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor={fieldId('equipmentType')}>
          {t('form.field.equipmentType')}{' '}
          <span className={styles.required}>{t('form.required')}</span>
        </label>
        <select
          id={fieldId('equipmentType')}
          aria-required="true"
          aria-invalid={errors.equipmentType ? 'true' : undefined}
          aria-describedby={errors.equipmentType ? errorId('equipmentType') : undefined}
          {...register('equipmentType')}
        >
          <option value="">{t('form.field.equipmentType.placeholder')}</option>
          {EQUIPMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(equipmentTypeKey(type))}
            </option>
          ))}
        </select>
        {errors.equipmentType ? (
          <p id={errorId('equipmentType')} className={styles.error}>
            {tMessage(errors.equipmentType.message ?? '')}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor={fieldId('inspectedAt')}>
          {t('form.field.inspectedAt')} <span className={styles.required}>{t('form.required')}</span>
        </label>
        <input
          id={fieldId('inspectedAt')}
          type="datetime-local"
          aria-required="true"
          aria-invalid={errors.inspectedAt ? 'true' : undefined}
          aria-describedby={errors.inspectedAt ? errorId('inspectedAt') : undefined}
          {...register('inspectedAt')}
        />
        {errors.inspectedAt ? (
          <p id={errorId('inspectedAt')} className={styles.error}>
            {tMessage(errors.inspectedAt.message ?? '')}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor={fieldId('inspectorName')}>
          {t('form.field.inspectorName')}{' '}
          <span className={styles.required}>{t('form.required')}</span>
        </label>
        <input
          id={fieldId('inspectorName')}
          type="text"
          autoComplete="name"
          aria-required="true"
          aria-invalid={errors.inspectorName ? 'true' : undefined}
          aria-describedby={errors.inspectorName ? errorId('inspectorName') : undefined}
          {...register('inspectorName')}
        />
        {errors.inspectorName ? (
          <p id={errorId('inspectorName')} className={styles.error}>
            {tMessage(errors.inspectorName.message ?? '')}
          </p>
        ) : null}
      </div>

      <fieldset className={styles.checks}>
        <legend className={styles.checksLegend}>{t('form.field.checks')}</legend>
        {CHECK_ITEMS.map((item) => {
          const error = errors.checks?.[item];
          return (
            <fieldset
              key={item}
              role="radiogroup"
              className={styles.checkItem}
              aria-required="true"
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? errorId(`checks-${item}`) : undefined}
            >
              <legend className={styles.checkItemLegend}>{t(checkItemKey(item))}</legend>
              <div className={styles.results}>
                {CHECK_RESULTS.map((result, index) => (
                  <label key={result} className={styles.radio} data-result={result}>
                    <input
                      // The first radio carries the id the error summary links to.
                      id={index === 0 ? fieldId(`checks-${item}`) : undefined}
                      type="radio"
                      value={result}
                      {...register(`checks.${item}`)}
                    />
                    <span>{t(checkResultKey(result))}</span>
                  </label>
                ))}
              </div>
              {error ? (
                <p id={errorId(`checks-${item}`)} className={styles.error}>
                  {tMessage(error.message ?? '')}
                </p>
              ) : null}
            </fieldset>
          );
        })}
      </fieldset>

      <div className={styles.field}>
        <label htmlFor={fieldId('remarks')}>{t('form.field.remarks')}</label>
        <p id={hintId('remarks')} className={styles.hint}>
          {t('form.field.remarks.hint')}
        </p>
        <textarea
          id={fieldId('remarks')}
          rows={4}
          maxLength={REMARKS_MAX_LENGTH}
          aria-invalid={errors.remarks ? 'true' : undefined}
          aria-describedby={
            errors.remarks ? `${hintId('remarks')} ${errorId('remarks')}` : hintId('remarks')
          }
          {...register('remarks')}
        />
        <p className={styles.counter}>{t('form.field.remarks.count', { count: remarksLength })}</p>
        {errors.remarks ? (
          <p id={errorId('remarks')} className={styles.error}>
            {tMessage(errors.remarks.message ?? '')}
          </p>
        ) : null}
      </div>

      <div className={styles.actions}>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('form.submitting') : t('form.submit')}
        </button>
        <button type="button" data-variant="secondary" onClick={onCancel}>
          {t('form.cancel')}
        </button>
      </div>
    </form>
  );
}
