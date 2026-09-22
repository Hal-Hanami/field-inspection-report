import { createContext, useContext } from 'react';
import type { InspectionRepository } from './InspectionRepository';

/**
 * Screens receive the repository instead of choosing one (DESIGN §3.3), which is what
 * lets a test render a screen against a repository holding exactly the reports the test
 * is about.
 */
export const RepositoryContext = createContext<InspectionRepository | null>(null);

export function useRepository(): InspectionRepository {
  const repository = useContext(RepositoryContext);
  if (!repository) {
    // Failing loudly here beats a screen that renders empty for a reason nobody can see.
    throw new Error('useRepository must be used inside a RepositoryProvider');
  }
  return repository;
}
