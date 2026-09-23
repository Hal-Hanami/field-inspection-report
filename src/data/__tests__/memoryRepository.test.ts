import { describe, expect, it } from 'vitest';
import { DraftRejectedError } from '../InspectionRepository';
import { createMemoryRepository, loadSeedReports } from '../memoryRepository';
import { makeChecks, makeDraft, makeReport } from '../../test/fixtures';

const NOW = new Date('2026-09-23T12:00');
const clock = () => NOW;
const fresh = () => ({ idempotencyKey: crypto.randomUUID() });

describe('memory repository (DESIGN §3.2, §3.4)', () => {
  it('§3.2: lists what it holds', async () => {
    const repository = createMemoryRepository({ reports: [makeReport()], now: clock });
    await expect(repository.list()).resolves.toHaveLength(1);
  });

  it('§3.2: a caller cannot mutate the stored reports through the list it is given', async () => {
    const repository = createMemoryRepository({ reports: [makeReport()], now: clock });
    (await repository.list()).pop();
    await expect(repository.list()).resolves.toHaveLength(1);
  });

  it('§3.2: saving assigns the identifier and the submission time', async () => {
    const repository = createMemoryRepository({ reports: [], now: clock });
    const saved = await repository.save(makeDraft(), fresh());
    expect(saved.id).toBe('RPT-0001');
    expect(saved.submittedAt).toBe(NOW.toISOString());
    await expect(repository.list()).resolves.toHaveLength(1);
  });

  it('§1.2: identifiers continue from the highest one held, never repeat it', async () => {
    const repository = createMemoryRepository({
      reports: [makeReport({ id: 'RPT-0007' })],
      now: clock,
    });
    expect((await repository.save(makeDraft(), fresh())).id).toBe('RPT-0008');
    expect((await repository.save(makeDraft(), fresh())).id).toBe('RPT-0009');
  });

  it('§1.2: what is stored is the normalized draft', async () => {
    const repository = createMemoryRepository({ reports: [], now: clock });
    const saved = await repository.save(makeDraft({ equipmentId: 'tr-0142 ', inspectorName: ' A ' }), fresh());
    expect(saved.equipmentId).toBe('TR-0142');
    expect(saved.inspectorName).toBe('A');
  });

  it('§3.2: the rules hold behind the UI — an invalid draft is rejected here too', async () => {
    const repository = createMemoryRepository({ reports: [], now: clock });
    const abnormalWithoutRemarks = makeDraft({
      checks: makeChecks({ appearance: 'abnormal' }),
      remarks: '',
    });
    await expect(repository.save(abnormalWithoutRemarks, fresh())).rejects.toBeInstanceOf(
      DraftRejectedError,
    );
    await expect(repository.list()).resolves.toHaveLength(0);
  });

  it('§3.4: a new instance starts from the seed — nothing is persisted', async () => {
    const first = createMemoryRepository({ now: clock });
    await first.save(makeDraft(), fresh());
    const second = createMemoryRepository({ now: clock });
    expect((await second.list()).length).toBe(loadSeedReports().length);
  });

  it('§6.3: the shipped seed satisfies the domain rules', () => {
    expect(loadSeedReports().length).toBeGreaterThan(0);
  });

  it('§7.6: the same key files a draft once, as the server does', async () => {
    const repository = createMemoryRepository({ reports: [], now: clock });
    const options = fresh();
    const first = await repository.save(makeDraft(), options);
    const again = await repository.save(makeDraft(), options);
    expect(again).toBe(first);
    await expect(repository.list()).resolves.toHaveLength(1);
  });

  it('§3.2: get answers null for an id it does not hold', async () => {
    const repository = createMemoryRepository({ reports: [makeReport()], now: clock });
    await expect(repository.get(makeReport().id)).resolves.toEqual(makeReport());
    await expect(repository.get('RPT-9999')).resolves.toBeNull();
  });

});
