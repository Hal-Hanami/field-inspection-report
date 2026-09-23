import { describe, expect, it } from 'vitest';
import type { ReportOut, ReportPage } from '../api/schema';
import { createHttpRepository, RepositoryUnavailableError } from '../httpRepository';
import { DraftRejectedError } from '../InspectionRepository';
import { makeChecks, makeDraft } from '../../test/fixtures';

/**
 * The adapter against a fake server that answers with the wire types generated from the
 * real one (DESIGN §7.4). The server itself is tested in api/tests against PostgreSQL.
 */

function wire(id: string, overrides: Partial<ReportOut> = {}): ReportOut {
  return {
    id,
    equipmentId: 'TR-0142',
    equipmentType: 'transformer',
    inspectedAt: '2026-09-22T09:20',
    inspectorName: 'Inspector',
    checks: makeChecks(),
    remarks: '',
    submittedAt: '2026-09-22T00:41:00.000Z',
    severity: 'ok',
    ...overrides,
  };
}

type Call = { url: string; init?: RequestInit };

function fakeServer(handler: (call: Call) => Response) {
  const calls: Call[] = [];
  const request = async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init };
    calls.push(call);
    return handler(call);
  };
  return { calls, request: request as typeof fetch };
}

const json = (body: unknown, status = 200, type = 'application/json') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': type } });

describe('HTTP repository (DESIGN §3.2, §7)', () => {
  it('§7.9: follows the cursor until the server says there is no more', async () => {
    const pages: Record<string, ReportPage> = {
      '': { items: [wire('RPT-0002')], nextCursor: 'c1' },
      c1: { items: [wire('RPT-0001')], nextCursor: null },
    };
    const server = fakeServer(({ url }) =>
      json(pages[new URL(url, 'http://x').searchParams.get('cursor') ?? '']),
    );
    const reports = await createHttpRepository('/api/', server.request).list();
    expect(reports.map((report) => report.id)).toEqual(['RPT-0002', 'RPT-0001']);
    expect(server.calls.map((call) => call.url)).toEqual([
      '/api/reports?limit=200',
      '/api/reports?limit=200&cursor=c1',
    ]);
  });

  it('§3.2: maps the wire report to the domain report, derived fields left behind', async () => {
    const server = fakeServer(() => json(wire('RPT-0003', { severity: 'abnormal' })));
    const report = await createHttpRepository('/api', server.request).get('RPT-0003');
    expect(report).not.toHaveProperty('severity');
    expect(report?.checks).toEqual(makeChecks());
  });

  it('§3.2: an unknown id is null, not an error', async () => {
    const server = fakeServer(() => json({ title: 'No such report.', status: 404 }, 404));
    await expect(createHttpRepository('/api', server.request).get('RPT-0404')).resolves.toBeNull();
  });

  it('§7.6: sends the idempotency key with the draft', async () => {
    const server = fakeServer(() => json(wire('RPT-0009'), 201));
    const saved = await createHttpRepository('/api', server.request).save(makeDraft(), {
      idempotencyKey: 'key-1',
    });
    expect(saved.id).toBe('RPT-0009');
    const [call] = server.calls;
    expect(call?.init?.method).toBe('POST');
    expect(new Headers(call?.init?.headers).get('Idempotency-Key')).toBe('key-1');
    expect(JSON.parse(String(call?.init?.body))).toEqual(makeDraft());
  });

  it('§7.2: a 422 becomes the field errors the form shows', async () => {
    const problem = {
      title: 'invalid',
      status: 422,
      errors: [{ field: 'inspectedAt', key: 'errors.inspectedAt.future' }],
    };
    const server = fakeServer(() => json(problem, 422, 'application/problem+json'));
    const saving = createHttpRepository('/api', server.request).save(makeDraft(), {
      idempotencyKey: 'k',
    });
    await expect(saving).rejects.toBeInstanceOf(DraftRejectedError);
    await expect(saving).rejects.toMatchObject({
      errors: [{ path: 'inspectedAt', message: 'errors.inspectedAt.future' }],
    });
  });

  it('§7.10: any other failure is an outage the screen reports', async () => {
    const server = fakeServer(() => json({ title: 'conflict', status: 409 }, 409));
    const saving = createHttpRepository('/api', server.request).save(makeDraft(), {
      idempotencyKey: 'k',
    });
    await expect(saving).rejects.toBeInstanceOf(RepositoryUnavailableError);
    await expect(saving).rejects.toMatchObject({ status: 409, message: 'conflict' });
  });

  it('§7.10: a failure without a problem body still carries its status', async () => {
    const server = fakeServer(() => new Response('bad gateway', { status: 502 }));
    await expect(createHttpRepository('/api', server.request).list()).rejects.toMatchObject({
      status: 502,
    });
    await expect(createHttpRepository('/api', server.request).get('x')).rejects.toBeInstanceOf(
      RepositoryUnavailableError,
    );
  });

  it('§3.4: a server keeps what is filed, and the adapter says so', () => {
    expect(createHttpRepository('/api').persistent).toBe(true);
  });
});
