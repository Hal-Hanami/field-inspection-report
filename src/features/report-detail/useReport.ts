import { useEffect, useState } from 'react';
import { useRepository } from '../../data/repositoryContext';
import type { InspectionReport } from '../../domain';

type State = { loading: true } | { loading: false; report: InspectionReport | null };

/** The detail screen's state (DESIGN §3.5): one report, or the answer that there is none. */
export function useReport(id: string): State {
  const repository = useRepository();
  const [state, setState] = useState<{ id: string; report: InspectionReport | null } | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      const report = await repository.get(id);
      if (active) setState({ id, report });
    };
    void load();
    return () => {
      active = false;
    };
  }, [repository, id]);

  // A result for another id is stale the moment the route changes.
  if (state === null || state.id !== id) return { loading: true };
  return { loading: false, report: state.report };
}
