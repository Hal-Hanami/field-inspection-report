import { useEffect, useState } from 'react';
import { useRepository } from '../../data/repositoryContext';
import { sortByInspectedAtDesc, type InspectionReport } from '../../domain';

/**
 * The list screen's state lives here, not in the component (DESIGN §3.5): the component
 * renders what it is handed, and this hook is what a test drives.
 */
export function useReports(): { reports: InspectionReport[]; loading: boolean } {
  const repository = useRepository();
  const [reports, setReports] = useState<InspectionReport[] | null>(null);

  useEffect(() => {
    // The repository is async (DESIGN §3.2), so the screen has a loading state today
    // rather than growing one when a server appears.
    let active = true;
    const load = async () => {
      const loaded = await repository.list();
      // The screen may be gone by the time the repository answers; setting state then
      // is work nobody sees and, with a real server, a warning nobody can act on.
      if (active) setReports(sortByInspectedAtDesc(loaded));
    };
    void load();
    return () => {
      active = false;
    };
  }, [repository]);

  return { reports: reports ?? [], loading: reports === null };
}
