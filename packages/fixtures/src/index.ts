import { type RepositoryWorld, validateRepositoryWorld } from '@codescape/schema';
import { buildEmptyWorld } from './empty.js';
import { buildDemoWorld } from './fixture.js';

export * from './fixture.js';
export { buildEmptyWorld } from './empty.js';

export function getDemoWorld(): RepositoryWorld {
  const world = buildDemoWorld();
  const result = validateRepositoryWorld(world);
  if (!result.success) {
    throw new Error(`Demo fixture invalid: ${result.errors.join(', ')}`);
  }
  return result.data;
}

export function getEmptyWorld(): RepositoryWorld {
  const world = buildEmptyWorld();
  const result = validateRepositoryWorld(world);
  if (!result.success) {
    throw new Error(`Empty fixture invalid: ${result.errors.join(', ')}`);
  }
  return result.data;
}
