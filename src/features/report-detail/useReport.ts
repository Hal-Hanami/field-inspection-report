import { useEffect, useState } from 'react';
import { useRepository } from '../../data/repositoryContext';
import type { InspectionReport } from '../../domain';

type State =
  | { loading: true; failed: false }
  | { loading: false; failed: true }
  | { loading: false; failed: false; report: InspectionReport | null };

/** The detail screen's state (DESIGN §3.5): one report, or the answer that there is none. */
export function useReport(id: string): State {
  const repository = useRepository();
  const [state, setState] = useState<
    { id: string; report: InspectionReport | null } | { id: string; failed: true } | null
  >(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const report = await repository.get(id);
        if (active) setState({ id, report });
      } catch {
        // §4.7 — said on the page, not left as loading that never ends.
        if (active) setState({ id, failed: true });
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [repository, id]);

  // A result for another id is stale the moment the route changes.
  if (state === null || state.id !== id) return { loading: true, failed: false };
  if ('failed' in state) return { loading: false, failed: true };
  return { loading: false, failed: false, report: state.report };
}
