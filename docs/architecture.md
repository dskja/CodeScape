# Architecture

## Overview

CodeScape is a TypeScript monorepo built with pnpm workspaces and Turborepo. It separates repository analysis, layout, rendering, and the web application into distinct packages.

## Package responsibilities

| Package | Responsibility |
|---------|----------------|
| `packages/schema` | Versioned `RepositoryWorld` schema with Zod runtime validation and semantic validation. |
| `packages/fixtures` | Synthetic demo and empty repository data. |
| `packages/analyzer-core` | Shared analyzer types, cross-platform path utilities, district derivation, and cycle detection. |
| `packages/analyzer-typescript` | Local TypeScript/JavaScript repository scanner using the TypeScript compiler API. |
| `packages/layout-engine` | Deterministic hierarchical 2D layout with no React or Three.js imports. |
| `packages/renderer` | React Three Fiber scene: buildings, roads, districts, camera state machine. |
| `apps/web` | Next.js App Router UI, search, inspector, empty state, and state. |
| `apps/cli` | Node.js CLI for analysis and validation with `--extension`, `--exclude`, and `--output`. |

## Architectural rules

- React owns layout, routing, controls, and UI state.
- Three.js / React Three Fiber owns only the 3D scene.
- `RepositoryWorld` contains no Three.js classes.
- The renderer never imports the analyzer.
- The analyzer never imports the renderer.
- The layout engine imports neither React nor Three.js.
- Browser-only code is confined to clearly marked client components.
- Public package APIs are exported from `index.ts`.
- Cyclic package dependencies are avoided.

## Data flow

```
Repository (files)
  -> analyzer-typescript
  -> RepositoryWorld (Zod + semantic validation)
  -> layout-engine
  -> Layout (serializable rectangles)
  -> renderer (React Three Fiber)
  -> web UI
```

## Scanner design

- `packages/analyzer-core` provides `normalizeRepositoryPath`, `repositoryDirname`, `repositoryBasename`, `deriveDistricts`, and `detectCycles`.
- `packages/analyzer-typescript` uses `node:path/posix` for internal path operations and normalizes Windows separators.
- The TypeScript compiler API extracts `import`, `export ... from`, dynamic `import()`, and `require()` statements.
- Relative imports without extension are resolved against `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.mts`, and `.cts`, including `index` files.
- Unreadable, binary, or invalid UTF-8 files are skipped and reported in `AnalyzerReport.skippedFiles`.
- Unresolved local imports are collected in `AnalyzerReport.unresolvedImports` and logged to `stderr`.

## Camera state machine

The renderer implements a local camera state machine:

- `idle`: user has full control via `OrbitControls`.
- `focus`: animates once from the current camera position to a building.
- `reset`: animates once from the current camera position to the default framing.
- `user-controlled`: entered as soon as the user interacts with `OrbitControls`; cancels any running animation.

`prefers-reduced-motion` snaps the camera immediately instead of animating. The web store `cameraCommand` is cleared when the animation finishes or is cancelled.

## Validation

`validateRepositoryWorld` from `packages/schema` first checks the Zod schema and then runs semantic checks, including duplicate ids, missing `district:root`, invalid parent references, building-to-district references, road endpoints, self-references, and metric and import count consistency.

## Test strategy

- Unit tests cover path normalization, district derivation, layout determinism, and semantic validation.
- E2E tests verify the web viewer with Playwright, including search, reset, empty state, and mobile viewport.
- Browser `pageerror` and `console.error` events cause E2E tests to fail unless explicitly filtered.
