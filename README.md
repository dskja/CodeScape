# CodeScape

CodeScape visualizes software repositories as interactive 3D cities: folders become districts, files become buildings, and dependencies become roads.

This repository is the technical foundation and first vertical prototype. It supports a synthetic demo fixture and a minimal TypeScript analyzer for local repositories.

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

```bash
# Analyze a repository
node apps/cli/dist/index.js analyze ./path/to/repo

# Validate a RepositoryWorld JSON
node apps/cli/dist/index.js validate ./world.json
```

## License

Apache-2.0. See [LICENSE](./LICENSE).
