import type { CheckResult } from '../domain';
import { checkResultKey, t } from '../i18n/t';
import styles from './SeverityBadge.module.css';

/**
 * Severity carries a text label and a shape, never colour alone (DESIGN §4.5): colour
 * fails for colour-blind readers, and fails again on a phone held in sunlight.
 */
export function SeverityBadge({ result }: { result: CheckResult }) {
  return (
    <span className={styles.badge} data-severity={result}>
      {t(checkResultKey(result))}
    </span>
  );
}
