# Contributing to CodeScape

We welcome contributions that align with the current project scope.

## Setup

1. Install [pnpm](https://pnpm.io/) and Node.js 20+.
2. Run `pnpm install`.
3. Run `pnpm typecheck && pnpm lint && pnpm test`.

## Guidelines

- Keep pull requests focused and minimal.
- Follow the existing package structure and naming.
- Do not add external cloud, database, or Docker dependencies.
- Do not include placeholder buttons, fake APIs, or production shortcuts.
- Write tests for new layout or schema behavior.
- Ensure `pnpm lint` and `pnpm typecheck` pass before submitting.

## Architecture decisions

Major architecture decisions are documented in `docs/architecture.md`. Propose changes in an issue before large refactors.
