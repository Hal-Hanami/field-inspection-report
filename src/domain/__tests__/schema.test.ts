import { describe, expect, it } from 'vitest';
import { CHECK_ITEMS } from '../types';
import { createDraftSchema, normalizeEquipmentId, parseReports, validateDraft } from '../schema';
import { makeChecks, makeDraft, makeReport } from '../../test/fixtures';

const NOW = new Date('2026-09-23T12:00:00+09:00');

function messagesFor(input: unknown, path: string): string[] {
  const result = validateDraft(input, NOW);
  if (result.valid) return [];
  return result.errors.filter((error) => error.path === path).map((error) => error.message);
}

describe('draft validation (DESIGN §2)', () => {
  it('§2: accepts a draft that breaks no rule', () => {
    const result = validateDraft(makeDraft(), NOW);
    expect(result.valid).toBe(true);
  });

  it('§1.1: the schema covers exactly the check items the domain declares', () => {
    const shape = createDraftSchema(NOW).safeParse(
      makeDraft({ checks: makeChecks() }),
    );
    expect(shape.success).toBe(true);
    const missingOne = { ...makeDraft().checks } as Record<string, string>;
    delete missingOne['appearance'];
    expect(messagesFor(makeDraft({ checks: missingOne as never }), 'checks.appearance')).toEqual([
      'errors.checks.required',
    ]);
    // Every declared item is a field of the schema, so adding one to the list without
    // adding it to the schema fails here rather than silently going unchecked.
    for (const item of CHECK_ITEMS) {
      const without = { ...makeDraft().checks } as Record<string, string>;
      delete without[item];
      expect(messagesFor(makeDraft({ checks: without as never }), `checks.${item}`)).toEqual([
        'errors.checks.required',
      ]);
    }
  });

  it('§2.1: an unanswered item is an error, never an implied ok', () => {
    expect(
      messagesFor(makeDraft({ checks: makeChecks({ temperature: '' as never }) }), 'checks.temperature'),
    ).toEqual(['errors.checks.required']);
  });

  it('§2.2: an abnormal finding requires remarks of at least five characters', () => {
    const abnormal = makeDraft({ checks: makeChecks({ appearance: 'abnormal' }) });
    expect(messagesFor(abnormal, 'remarks')).toEqual(['errors.remarks.requiredForAbnormal']);
    expect(messagesFor({ ...abnormal, remarks: 'abcd' }, 'remarks')).toEqual([
      'errors.remarks.requiredForAbnormal',
    ]);
    expect(validateDraft({ ...abnormal, remarks: 'cracked' }, NOW).valid).toBe(true);
  });

  it('§2.2: caution alone does not require remarks', () => {
    expect(validateDraft(makeDraft({ checks: makeChecks({ corrosion: 'caution' }) }), NOW).valid).toBe(
      true,
    );
  });

  it('§2.3: remarks stop at 200 characters', () => {
    expect(validateDraft(makeDraft({ remarks: 'a'.repeat(200) }), NOW).valid).toBe(true);
    expect(messagesFor(makeDraft({ remarks: 'a'.repeat(201) }), 'remarks')).toEqual([
      'errors.remarks.tooLong',
    ]);
  });

  it('§2.4: the inspection time is required, parseable, and not in the future', () => {
    expect(messagesFor(makeDraft({ inspectedAt: '' }), 'inspectedAt')).toContain(
      'errors.inspectedAt.required',
    );
    expect(messagesFor(makeDraft({ inspectedAt: 'yesterday' }), 'inspectedAt')).toContain(
      'errors.inspectedAt.invalid',
    );
    expect(messagesFor(makeDraft({ inspectedAt: '2026-09-23T12:01' }), 'inspectedAt')).toContain(
      'errors.inspectedAt.future',
    );
  });

  it('§2.4: the clock is the one the caller passes, not the machine the test runs on', () => {
    const draft = makeDraft({ inspectedAt: '2026-09-23T11:00' });
    expect(validateDraft(draft, NOW).valid).toBe(true);
    expect(validateDraft(draft, new Date('2026-09-23T10:00:00+09:00')).valid).toBe(false);
  });

  it('§2.5: the inspector name is required and stops at 32 characters', () => {
    expect(messagesFor(makeDraft({ inspectorName: '   ' }), 'inspectorName')).toContain(
      'errors.inspectorName.required',
    );
    expect(messagesFor(makeDraft({ inspectorName: 'a'.repeat(33) }), 'inspectorName')).toContain(
      'errors.inspectorName.tooLong',
    );
  });

  it('§2.6: the equipment id must match the plate format', () => {
    expect(messagesFor(makeDraft({ equipmentId: '' }), 'equipmentId')).toContain(
      'errors.equipmentId.required',
    );
    expect(messagesFor(makeDraft({ equipmentId: 'TR-14' }), 'equipmentId')).toContain(
      'errors.equipmentId.format',
    );
  });

  it('§1.2: the equipment id is normalized before it is judged, and stored normalized', () => {
    expect(normalizeEquipmentId(' tr-0142 ')).toBe('TR-0142');
    const result = validateDraft(makeDraft({ equipmentId: ' tr-0142 ' }), NOW);
    expect(result.valid).toBe(true);
    expect(result.valid ? result.draft.equipmentId : null).toBe('TR-0142');
  });

  it('§2.7: every failing field is reported at once', () => {
    const result = validateDraft(
      makeDraft({ equipmentId: 'nope', inspectorName: '', inspectedAt: '' }),
      NOW,
    );
    expect(result.valid).toBe(false);
    const paths = result.valid ? [] : result.errors.map((error) => error.path);
    expect(new Set(paths)).toEqual(new Set(['equipmentId', 'inspectorName', 'inspectedAt']));
  });

  it('§2: an unexpected shape is rejected rather than coerced', () => {
    expect(validateDraft(null, NOW).valid).toBe(false);
    expect(validateDraft({}, NOW).valid).toBe(false);
  });
});

describe('stored reports (DESIGN §6.3)', () => {
  it('§6.3: parses reports that satisfy the rules', () => {
    expect(parseReports([makeReport()])).toHaveLength(1);
  });

  it('§6.3: refuses a report the form itself would refuse', () => {
    expect(() => parseReports([makeReport({ id: '7' })])).toThrow(/errors\.id\.format/);
    expect(() => parseReports([makeReport({ equipmentId: 'oops' })])).toThrow(
      /errors\.equipmentId\.format/,
    );
  });
});
