import type { RepositoryWorld } from '@codescape/schema';

export function buildEmptyWorld(): RepositoryWorld {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    repository: {
      name: 'empty',
      rootPath: '/empty',
      analyzedAt: now,
      languages: [],
    },
    districts: [{ id: 'district:root', path: '', name: 'root', parentId: null, depth: 0 }],
    buildings: [],
    roads: [],
    metrics: {
      totalFiles: 0,
      totalDirectories: 1,
      totalLinesOfCode: 0,
      totalDependencies: 0,
      circularDependencyGroups: [],
    },
  };
}
