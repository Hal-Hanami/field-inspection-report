import { describe, expect, it } from 'vitest';
import { isAtLeast, severityOf } from '../severity';
import { makeChecks } from '../../test/fixtures';

describe('severity (DESIGN §1.3)', () => {
  it('§1.3: is ok when every check is ok', () => {
    expect(severityOf(makeChecks())).toBe('ok');
  });

  it('§1.3: is the worst result present, not the last or the most frequent', () => {
    expect(severityOf(makeChecks({ corrosion: 'caution' }))).toBe('caution');
    expect(severityOf(makeChecks({ appearance: 'abnormal', corrosion: 'caution' }))).toBe(
      'abnormal',
    );
    expect(severityOf(makeChecks({ appearance: 'caution', surroundings: 'abnormal' }))).toBe(
      'abnormal',
    );
  });

  it('§1.3: orders results ok < caution < abnormal', () => {
    expect(isAtLeast('caution', 'ok')).toBe(true);
    expect(isAtLeast('abnormal', 'caution')).toBe(true);
    expect(isAtLeast('ok', 'caution')).toBe(false);
  });
});
