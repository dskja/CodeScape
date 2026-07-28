# Architecture

## Overview

CodeScape is a TypeScript monorepo built with pnpm workspaces and Turborepo. It separates repository analysis, layout, rendering, and the web application into distinct packages.

## Package responsibilities

| Package | Responsibility |
|---------|----------------|
| `packages/schema` | Versioned `RepositoryWorld` schema with Zod runtime validation. |
| `packages/fixtures` | Synthetic demo repository data. |
| `packages/analyzer-core` | Shared analyzer types. |
| `packages/analyzer-typescript` | Local TypeScript/JavaScript repository scanner. |
| `packages/layout-engine` | Deterministic hierarchical 2D layout with no React or Three.js imports. |
| `packages/renderer` | React Three Fiber scene: buildings, roads, districts, camera. |
| `apps/web` | Next.js App Router UI, search, inspector, and state. |
| `apps/cli` | Node.js CLI for analysis and validation. |

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
  -> RepositoryWorld (Zod validated)
  -> layout-engine
  -> Layout (serializable rectangles)
  -> renderer (React Three Fiber)
  -> web UI
```

## Rendering strategy

- Buildings are rendered with `InstancedMesh` using a unit box geometry scaled per instance.
- Districts are rendered as transparent instanced planes.
- Roads are rendered as `LineSegments` from source to target building centers.
- The canvas is loaded client-side only via Next.js `dynamic` with `ssr: false`.
- The animation loop pauses when the page is not visible.
- WebGL resources are released by React Three Fiber on unmount.
