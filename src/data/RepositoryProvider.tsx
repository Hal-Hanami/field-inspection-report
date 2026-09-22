import type { ReactNode } from 'react';
import type { InspectionRepository } from './InspectionRepository';
import { RepositoryContext } from './repositoryContext';

export function RepositoryProvider({
  repository,
  children,
}: {
  repository: InspectionRepository;
  children: ReactNode;
}) {
  return <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>;
}
