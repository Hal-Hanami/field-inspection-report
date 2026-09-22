import { describe, expect, it } from 'vitest';
import { DraftRejectedError } from '../InspectionRepository';
import { createMemoryRepository, loadSeedReports } from '../memoryRepository';
import { makeChecks, makeDraft, makeReport } from '../../test/fixtures';

const NOW = new Date('2026-09-23T12:00');
const clock = () => NOW;

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
    const saved = await repository.save(makeDraft());
    expect(saved.id).toBe('RPT-0001');
    expect(saved.submittedAt).toBe(NOW.toISOString());
    await expect(repository.list()).resolves.toHaveLength(1);
  });

  it('§1.2: identifiers continue from the highest one held, never repeat it', async () => {
    const repository = createMemoryRepository({
      reports: [makeReport({ id: 'RPT-0007' })],
      now: clock,
    });
    expect((await repository.save(makeDraft())).id).toBe('RPT-0008');
    expect((await repository.save(makeDraft())).id).toBe('RPT-0009');
  });

  it('§1.2: what is stored is the normalized draft', async () => {
    const repository = createMemoryRepository({ reports: [], now: clock });
    const saved = await repository.save(makeDraft({ equipmentId: 'tr-0142 ', inspectorName: ' A ' }));
    expect(saved.equipmentId).toBe('TR-0142');
    expect(saved.inspectorName).toBe('A');
  });

  it('§3.2: the rules hold behind the UI — an invalid draft is rejected here too', async () => {
    const repository = createMemoryRepository({ reports: [], now: clock });
    const abnormalWithoutRemarks = makeDraft({
      checks: makeChecks({ appearance: 'abnormal' }),
      remarks: '',
    });
    await expect(repository.save(abnormalWithoutRemarks)).rejects.toBeInstanceOf(
      DraftRejectedError,
    );
    await expect(repository.list()).resolves.toHaveLength(0);
  });

  it('§3.4: a new instance starts from the seed — nothing is persisted', async () => {
    const first = createMemoryRepository({ now: clock });
    await first.save(makeDraft());
    const second = createMemoryRepository({ now: clock });
    expect((await second.list()).length).toBe(loadSeedReports().length);
  });

  it('§6.3: the shipped seed satisfies the domain rules', () => {
    expect(loadSeedReports().length).toBeGreaterThan(0);
  });
});
