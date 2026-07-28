import { type RepositoryWorld, validateRepositoryWorld } from '@codescape/schema';
import { buildDemoWorld } from './fixture.js';

export * from './fixture.js';

export function getDemoWorld(): RepositoryWorld {
  const world = buildDemoWorld();
  const result = validateRepositoryWorld(world);
  if (!result.success) {
    throw new Error(`Demo fixture invalid: ${result.errors.join(', ')}`);
  }
  return result.data;
}
