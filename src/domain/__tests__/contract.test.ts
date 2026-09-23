import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateDraft } from '../schema';
import { severityOf } from '../severity';
import type { Checks } from '../types';

/**
 * DESIGN §7.3. The server runs the same file (api/tests/test_contract.py). Changing a rule
 * here without changing it there, or the other way round, fails one of the two suites.
 */

type Draft = Record<string, unknown> & { checks: Record<string, string> };
type DraftCase = {
  name: string;
  now: string;
  patch: Partial<Draft>;
  expect:
    | { valid: true; normalizedPatch: Partial<Draft> }
    | { valid: false; errors: Record<string, string> };
};
type Contract = {
  baseDraft: Draft;
  draftCases: DraftCase[];
  severityCases: { checks: Checks; severity: string }[];
};

// Read from the repository root, where the suite runs, like the other repository gates.
const contract = JSON.parse(readFileSync('contracts/validation-cases.json', 'utf8')) as Contract;

function apply(draft: Draft, patch: Partial<Draft>): Draft {
  return { ...draft, ...patch, checks: { ...draft.checks, ...patch.checks } };
}

const validCases = contract.draftCases.filter((c) => c.expect.valid);
const invalidCases = contract.draftCases.filter((c) => !c.expect.valid);

function run(testCase: DraftCase) {
  const input = apply(contract.baseDraft, testCase.patch);
  // `now` is wall-clock time in the users' zone, parsed the way `inspectedAt` is.
  return { input, result: validateDraft(input, new Date(testCase.now)) };
}

describe('shared validation cases (DESIGN §7.3)', () => {
  it.each(validCases.map((c) => [c.name, c] as const))('§7.3: %s', (_, testCase) => {
    const { input, result } = run(testCase);
    const normalizedPatch = (testCase.expect as { normalizedPatch: Partial<Draft> }).normalizedPatch;
    expect(result).toEqual({ valid: true, draft: apply(input, normalizedPatch) });
  });

  it.each(invalidCases.map((c) => [c.name, c] as const))('§7.3: %s', (_, testCase) => {
    const { result } = run(testCase);
    const errors = result.valid ? [] : result.errors;
    // One message per field: a second message on the same field is a consequence of the
    // first, and the server reports exactly one.
    expect(errors.map((error) => error.path)).toEqual([...new Set(errors.map((e) => e.path))]);
    expect(Object.fromEntries(errors.map((error) => [error.path, error.message]))).toEqual(
      (testCase.expect as { errors: Record<string, string> }).errors,
    );
  });

  it.each(contract.severityCases.map((c) => [c.severity, c] as const))(
    '§7.3: severity %s',
    (severity, testCase) => {
      expect(severityOf(testCase.checks)).toBe(severity);
    },
  );
});
