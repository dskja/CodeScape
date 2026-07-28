import { type RepositoryWorld, repositoryWorldSchema } from './types.js';

export type ValidationResult =
  | { success: true; errors: []; data: RepositoryWorld }
  | { success: false; errors: string[] };

export function validateRepositoryWorld(value: unknown): ValidationResult {
  const parsed = repositoryWorldSchema.safeParse(value);
  if (parsed.success) {
    return { success: true, errors: [], data: parsed.data };
  }
  return {
    success: false,
    errors: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
