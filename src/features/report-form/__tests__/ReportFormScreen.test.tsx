import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  DraftRejectedError,
  type InspectionRepository,
} from '../../../data/InspectionRepository';
import { createMemoryRepository } from '../../../data/memoryRepository';
import { CHECK_ITEMS, type CheckItem, type CheckResult } from '../../../domain';
import { checkItemKey, checkResultKey, t } from '../../../i18n/t';
import { pastDateTimeValue } from '../../../test/fixtures';
import { renderApp } from '../../../test/renderApp';

function field(label: string): HTMLElement {
  return screen.getByLabelText(label, { exact: false });
}

async function answer(user: UserEvent, item: CheckItem, result: CheckResult) {
  const group = screen.getByRole('radiogroup', { name: t(checkItemKey(item)) });
  await user.click(within(group).getByRole('radio', { name: t(checkResultKey(result)) }));
}

async function fillValidDraft(user: UserEvent, overrides: { remarks?: string } = {}) {
  await user.type(field(t('form.field.equipmentId')), 'tr-0142');
  await user.selectOptions(field(t('form.field.equipmentType')), 'transformer');
  // A `datetime-local` control takes a whole value; typing it key by key is a fight
  // with the browser widget, not a test of this form.
  fireEvent.change(field(t('form.field.inspectedAt')), { target: { value: pastDateTimeValue() } });
  await user.type(field(t('form.field.inspectorName')), 'Inspector');
  for (const item of CHECK_ITEMS) await answer(user, item, 'ok');
  if (overrides.remarks) await user.type(field(t('form.field.remarks')), overrides.remarks);
}

function submitButton() {
  return screen.getByRole('button', { name: t('form.submit') });
}

/** What a screen reader would read out for this control (DESIGN §5.2). */
function describedTextOf(control: HTMLElement): string {
  return (control.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
}

describe('report form (DESIGN §5)', () => {
  it('§5.1: every control carries a name and required controls say so', () => {
    renderApp({ route: '/reports/new' });

    expect(field(t('form.field.equipmentId'))).toHaveAttribute('aria-required', 'true');
    expect(field(t('form.field.equipmentType'))).toHaveAttribute('aria-required', 'true');
    expect(field(t('form.field.inspectedAt'))).toHaveAttribute('aria-required', 'true');
    expect(field(t('form.field.inspectorName'))).toHaveAttribute('aria-required', 'true');
    expect(field(t('form.field.remarks'))).toBeInTheDocument();

    for (const item of CHECK_ITEMS) {
      expect(screen.getByRole('radiogroup', { name: t(checkItemKey(item)) })).toBeInTheDocument();
    }
  });

  it('§5.3: an invalid submit announces what is wrong and moves focus to the first problem', async () => {
    const { user } = renderApp({ route: '/reports/new' });

    await user.click(submitButton());

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent(t('errors.equipmentId.required'));
    expect(summary).toHaveTextContent(t('errors.checks.required'));
    await waitFor(() => expect(field(t('form.field.equipmentId'))).toHaveFocus());
  });

  it('§2.7: one submit reveals every mistake, not the first one', async () => {
    const { user } = renderApp({ route: '/reports/new' });

    await user.type(field(t('form.field.equipmentId')), 'nope');
    await user.click(submitButton());

    const summary = await screen.findByRole('alert');
    const messages = within(summary).getAllByRole('listitem');
    // equipment id, type, time, inspector, five check items
    expect(messages).toHaveLength(9);
  });

  it('§5.2: a rejected control is marked invalid and points at its own message', async () => {
    const { user } = renderApp({ route: '/reports/new' });

    await user.type(field(t('form.field.equipmentId')), 'nope');
    await user.click(submitButton());

    const input = field(t('form.field.equipmentId'));
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    expect(describedTextOf(input)).toContain(t('errors.equipmentId.format'));
  });

  it('§2.2: an abnormal finding cannot be filed without remarks, and can be with them', async () => {
    const { user } = renderApp({ route: '/reports/new' });

    await fillValidDraft(user);
    await answer(user, 'appearance', 'abnormal');
    await user.click(submitButton());

    const remarks = field(t('form.field.remarks'));
    await waitFor(() => expect(remarks).toHaveAttribute('aria-invalid', 'true'));
    expect(describedTextOf(remarks)).toContain(t('errors.remarks.requiredForAbnormal'));

    await user.type(field(t('form.field.remarks')), 'cracked insulator');
    await user.click(submitButton());

    expect(await screen.findByRole('heading', { name: t('list.title') })).toBeInTheDocument();
  });

  it('§4.2: filing a report ends on the list, with that report named and visible', async () => {
    const repository = createMemoryRepository({ reports: [] });
    const { user } = renderApp({ route: '/reports/new', repository });

    await fillValidDraft(user);
    await user.click(submitButton());

    expect(await screen.findByText(t('list.saved', { id: 'RPT-0001' }))).toBeInTheDocument();
    const table = await screen.findByRole('table');
    expect(within(table).getByText('TR-0142')).toBeInTheDocument();
    await expect(repository.list()).resolves.toHaveLength(1);
  });

  it('§5.2: correcting a field clears its error without another submit', async () => {
    const { user } = renderApp({ route: '/reports/new' });

    await user.type(field(t('form.field.equipmentId')), 'nope');
    await user.click(submitButton());
    await waitFor(() =>
      expect(field(t('form.field.equipmentId'))).toHaveAttribute('aria-invalid', 'true'),
    );

    await user.clear(field(t('form.field.equipmentId')));
    await user.type(field(t('form.field.equipmentId')), 'TR-0142');

    await waitFor(() =>
      expect(field(t('form.field.equipmentId'))).not.toHaveAttribute('aria-invalid'),
    );
  });

  it('§3.2: a repository failure is reported rather than swallowed', async () => {
    const failing = {
      list: async () => [],
      get: async () => null,
      save: async () => {
        throw new Error('network down');
      },
    };
    const { user } = renderApp({ route: '/reports/new', repository: failing });

    await fillValidDraft(user);
    await user.click(submitButton());

    expect(await screen.findByText(t('errors.save.failed'))).toBeInTheDocument();
  });

  it('§4.2: cancelling returns to the list without filing anything', async () => {
    const repository = createMemoryRepository({ reports: [] });
    const { user } = renderApp({ route: '/reports/new', repository });

    await user.click(screen.getByRole('button', { name: t('form.cancel') }));

    expect(await screen.findByRole('heading', { name: t('list.title') })).toBeInTheDocument();
    await expect(repository.list()).resolves.toHaveLength(0);
  });

  it('§7.2: a draft the server refuses is marked on the field the server names', async () => {
    const refusing: InspectionRepository = {
      list: async () => [],
      get: async () => null,
      save: async () => {
        throw new DraftRejectedError([
          { path: 'inspectedAt', message: 'errors.inspectedAt.future' },
        ]);
      },
    };
    const { user } = renderApp({ route: '/reports/new', repository: refusing });

    await fillValidDraft(user);
    await user.click(submitButton());

    const control = field(t('form.field.inspectedAt'));
    await waitFor(() => expect(control).toHaveAttribute('aria-invalid', 'true'));
    expect(describedTextOf(control)).toContain(t('errors.inspectedAt.future'));
    expect(screen.getByRole('alert')).toHaveTextContent(t('errors.inspectedAt.future'));
    expect(screen.queryByText(t('errors.save.failed'))).not.toBeInTheDocument();
  });

  it('§7.6: pressing the button again after a failure retries the same filing', async () => {
    const keys: string[] = [];
    let attempts = 0;
    const flaky: InspectionRepository = {
      ...createMemoryRepository({ reports: [] }),
      save: async (draft, options) => {
        keys.push(options.idempotencyKey);
        attempts += 1;
        if (attempts === 1) throw new Error('response lost');
        return { ...draft, id: 'RPT-0001', submittedAt: '2026-09-22T00:41:00.000Z' };
      },
    };
    const { user } = renderApp({ route: '/reports/new', repository: flaky });

    await fillValidDraft(user);
    await user.click(submitButton());
    expect(await screen.findByText(t('errors.save.failed'))).toBeInTheDocument();
    await user.click(submitButton());

    expect(await screen.findByText(t('list.saved', { id: 'RPT-0001' }))).toBeInTheDocument();
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
  });
});
