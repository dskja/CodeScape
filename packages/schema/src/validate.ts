import { validateRepositoryWorldSemantic } from './semantic.js';
import { type RepositoryWorld, repositoryWorldSchema } from './types.js';

export type ValidationResult =
  | { success: true; errors: []; data: RepositoryWorld }
  | { success: false; errors: string[] };

export function validateRepositoryWorld(value: unknown): ValidationResult {
  const parsed = repositoryWorldSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  const semanticErrors = validateRepositoryWorldSemantic(parsed.data);
  if (semanticErrors.length > 0) {
    return { success: false, errors: semanticErrors };
  }

  return { success: true, errors: [], data: parsed.data };
}

export { validateRepositoryWorldSemantic };
