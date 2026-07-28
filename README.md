# CodeScape

CodeScape visualizes software repositories as interactive 3D cities: folders become districts, files become buildings, and dependencies become roads.

This repository is the technical foundation and first vertical prototype. It supports a synthetic demo fixture and a TypeScript/JavaScript analyzer for local repositories.

## Tech stack

- TypeScript with strict mode
- pnpm workspaces + Turborepo
- Next.js App Router
- Three.js + React Three Fiber
- Zod + Zustand
- Vitest + Playwright
- Biome

## Getting started

```bash
# Install dependencies
pnpm install

# Run the web demo
pnpm dev

# Run checks
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e

# Build everything
pnpm build
```

The web application is available at [http://localhost:3000](http://localhost:3000).

## CLI

The `codescape` CLI can analyze a local repository and emit a `RepositoryWorld` JSON document.

```bash
# Analyze a repository and print JSON to stdout
pnpm codescape analyze ./path/to/repo

# Write JSON to a file
pnpm codescape analyze ./path/to/repo --output .codescape/world.json

# Limit to specific extensions
pnpm codescape analyze ./path/to/repo --extension .ts --extension .tsx

# Exclude directories or file names
pnpm codescape analyze ./path/to/repo --exclude generated --exclude vendor

# Validate an existing RepositoryWorld JSON file
pnpm codescape validate ./world.json
```

Supported file extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.mts`, `.cts`.

## How it works

1. `packages/analyzer-typescript` scans a repository on disk.
2. It extracts imports and exports with the TypeScript compiler API.
3. It produces a serializable `RepositoryWorld` that `packages/schema` validates both structurally and semantically.
4. `packages/layout-engine` computes a deterministic 2D layout.
5. `packages/renderer` draws the city with React Three Fiber.
6. `apps/web` hosts the search, inspector, and reset controls.

## Known limitations

- TypeScript path aliases and monorepo workspace resolution are not yet implemented.
- External package dependencies are not represented as buildings or roads.
- Only local relative and absolute imports are resolved.

## License

Apache-2.0. See [LICENSE](./LICENSE).
