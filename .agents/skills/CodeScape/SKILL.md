```markdown
# CodeScape Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the CodeScape TypeScript codebase. You'll learn how to structure files, write imports and exports, follow commit message patterns, and understand the project's approach to testing. These guidelines ensure consistency and maintainability across the project.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `userProfile.ts`, `dataFetcher.ts`

### Import Style
- Mixed import styles are used. Both default and named imports may appear.
  - Example:
    ```typescript
    import fs from 'fs';
    import { parseData, formatData } from './dataUtils';
    ```

### Export Style
- Prefer **named exports** for modules.
  - Example:
    ```typescript
    // dataUtils.ts
    export function parseData(input: string) { /* ... */ }
    export function formatData(data: any) { /* ... */ }
    ```

### Commit Patterns
- Commit messages are freeform, with no strict prefixing.
- Typical length is around 69 characters.
  - Example:
    ```
    Add support for new user roles in the permissions module
    ```

## Workflows

### Adding a New Module
**Trigger:** When you need to introduce a new feature or utility.
**Command:** `/add-module`

1. Create a new file using camelCase naming (e.g., `featureName.ts`).
2. Write your TypeScript code, using named exports.
3. Import dependencies using mixed style as needed.
4. Add relevant tests in a corresponding `*.test.ts` file.
5. Commit your changes with a clear, descriptive message.

### Writing Tests
**Trigger:** When you add or modify functionality.
**Command:** `/write-test`

1. Create a test file named after the module, using the pattern `moduleName.test.ts`.
2. Write test cases using the project's preferred (unknown) testing framework.
3. Ensure all new and existing tests pass before committing.

### Refactoring Code
**Trigger:** When improving code structure or readability.
**Command:** `/refactor`

1. Update file and variable names to match camelCase convention.
2. Ensure imports and exports follow the documented styles.
3. Update or add tests if necessary.
4. Commit changes with a descriptive message.

## Testing Patterns

- Test files follow the pattern: `*.test.*` (e.g., `userProfile.test.ts`).
- The specific testing framework is not identified, but tests are colocated with source files or in a dedicated test directory.
- Example test file:
  ```typescript
  // userProfile.test.ts
  import { getUserProfile } from './userProfile';

  describe('getUserProfile', () => {
    it('returns user data for valid ID', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command      | Purpose                                    |
|--------------|--------------------------------------------|
| /add-module  | Scaffold and add a new module              |
| /write-test  | Create and write tests for a module        |
| /refactor    | Refactor code to follow conventions        |
```
