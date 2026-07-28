# Contributing to CodeScape

We welcome contributions that align with the current project scope.

## Setup

1. Install [pnpm](https://pnpm.io/) and Node.js 20+.
2. Run `pnpm install`.
3. Run `pnpm typecheck && pnpm lint && pnpm test`.

## Project commands

- `pnpm dev` - Start the Next.js development server.
- `pnpm build` - Build all packages and the web app.
- `pnpm typecheck` - Type-check all packages.
- `pnpm lint` - Run Biome lint and package lint scripts.
- `pnpm test` - Run unit tests.
- `pnpm test:e2e` - Run Playwright end-to-end tests.

## Guidelines

- Keep pull requests focused and minimal.
- Follow the existing package structure and naming.
- Do not add external cloud, database, or Docker dependencies.
- Do not include placeholder buttons, fake APIs, or production shortcuts.
- Write tests for new layout, schema, analyzer, or rendering behavior.
- Reuse shared utilities in `packages/analyzer-core` instead of duplicating path, district, or validation logic.
- Ensure `pnpm lint` and `pnpm typecheck` pass before submitting.

## Test structure

- Unit tests are co-located with source files as `*.test.ts` and run with Vitest.
- E2E tests live in `apps/web/e2e/` and run with Playwright.
- E2E tests fail on unexpected browser `pageerror` and `console.error` events.

## Architecture decisions

Major architecture decisions are documented in `docs/architecture.md`. Propose changes in an issue before large refactors.
