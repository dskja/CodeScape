import type {
  Building,
  DependencyRoad,
  District,
  Repository,
  RepositoryMetrics,
  RepositoryWorld,
  RoadKind,
} from '@codescape/schema';

export interface FixtureModule {
  path: string;
  linesOfCode: number;
  bytes: number;
  complexity: number;
  imports: Array<{ path: string; kind: RoadKind; weight?: number }>;
}

const now = new Date().toISOString();

const rootModules: FixtureModule[] = [
  {
    path: 'src/app/page.tsx',
    linesOfCode: 120,
    bytes: 4100,
    complexity: 4,
    imports: [
      { path: 'src/components/Navbar.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/components/Sidebar.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/components/Button.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/services/api.ts', kind: 'static-import', weight: 1 },
      { path: 'src/hooks/useAuth.ts', kind: 'static-import', weight: 1 },
      { path: 'src/hooks/useTheme.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/app/layout.tsx',
    linesOfCode: 60,
    bytes: 1800,
    complexity: 2,
    imports: [
      { path: 'src/app/providers.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/styles/theme.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/app/providers.tsx',
    linesOfCode: 45,
    bytes: 1300,
    complexity: 2,
    imports: [{ path: 'src/hooks/useTheme.ts', kind: 'static-import', weight: 1 }],
  },
  {
    path: 'src/components/Button.tsx',
    linesOfCode: 85,
    bytes: 2700,
    complexity: 3,
    imports: [
      { path: 'src/utils/styles.ts', kind: 'static-import', weight: 1 },
      { path: 'src/utils/constants.ts', kind: 'type-import', weight: 1 },
    ],
  },
  {
    path: 'src/components/Card.tsx',
    linesOfCode: 70,
    bytes: 2300,
    complexity: 2,
    imports: [
      { path: 'src/components/Button.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/utils/styles.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/components/Input.tsx',
    linesOfCode: 90,
    bytes: 2900,
    complexity: 3,
    imports: [
      { path: 'src/utils/validate.ts', kind: 'static-import', weight: 1 },
      { path: 'src/utils/constants.ts', kind: 'type-import', weight: 1 },
    ],
  },
  {
    path: 'src/components/Modal.tsx',
    linesOfCode: 110,
    bytes: 3500,
    complexity: 4,
    imports: [
      { path: 'src/components/Button.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/components/Card.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/hooks/useFocus.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/components/Navbar.tsx',
    linesOfCode: 75,
    bytes: 2500,
    complexity: 3,
    imports: [
      { path: 'src/components/Button.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/hooks/useAuth.ts', kind: 'static-import', weight: 1 },
      { path: 'src/services/api.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/components/Sidebar.tsx',
    linesOfCode: 95,
    bytes: 3100,
    complexity: 3,
    imports: [
      { path: 'src/components/Button.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/hooks/useTheme.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/components/Table.tsx',
    linesOfCode: 140,
    bytes: 4200,
    complexity: 5,
    imports: [
      { path: 'src/components/Button.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/components/Input.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/utils/sort.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/components/Chart.tsx',
    linesOfCode: 130,
    bytes: 4000,
    complexity: 5,
    imports: [
      { path: 'src/components/Card.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/utils/format.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/components/Tooltip.tsx',
    linesOfCode: 55,
    bytes: 1900,
    complexity: 2,
    imports: [{ path: 'src/hooks/useFocus.ts', kind: 'static-import', weight: 1 }],
  },
  {
    path: 'src/components/Form.tsx',
    linesOfCode: 160,
    bytes: 5100,
    complexity: 6,
    imports: [
      { path: 'src/components/Input.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/components/Button.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/hooks/useForm.ts', kind: 'static-import', weight: 1 },
      { path: 'src/utils/validate.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/components/List.tsx',
    linesOfCode: 80,
    bytes: 2600,
    complexity: 3,
    imports: [
      { path: 'src/components/Card.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/utils/sort.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/services/api.ts',
    linesOfCode: 110,
    bytes: 3400,
    complexity: 4,
    imports: [
      { path: 'src/utils/constants.ts', kind: 'static-import', weight: 1 },
      { path: 'src/services/auth.ts', kind: 'static-import', weight: 1 },
      { path: 'src/services/logger.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/services/auth.ts',
    linesOfCode: 95,
    bytes: 3000,
    complexity: 4,
    imports: [
      { path: 'src/services/storage.ts', kind: 'static-import', weight: 1 },
      { path: 'src/utils/constants.ts', kind: 'static-import', weight: 1 },
      { path: 'src/utils/validate.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/services/storage.ts',
    linesOfCode: 70,
    bytes: 2200,
    complexity: 3,
    imports: [
      { path: 'src/utils/constants.ts', kind: 'static-import', weight: 1 },
      { path: 'src/utils/helpers.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/services/logger.ts',
    linesOfCode: 50,
    bytes: 1600,
    complexity: 2,
    imports: [{ path: 'src/utils/constants.ts', kind: 'static-import', weight: 1 }],
  },
  {
    path: 'src/services/notifications.ts',
    linesOfCode: 65,
    bytes: 2100,
    complexity: 3,
    imports: [
      { path: 'src/services/api.ts', kind: 'static-import', weight: 1 },
      { path: 'src/utils/constants.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/hooks/useAuth.ts',
    linesOfCode: 85,
    bytes: 2700,
    complexity: 3,
    imports: [
      { path: 'src/services/auth.ts', kind: 'static-import', weight: 1 },
      { path: 'src/hooks/useFetch.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/hooks/useFetch.ts',
    linesOfCode: 75,
    bytes: 2400,
    complexity: 3,
    imports: [
      { path: 'src/services/api.ts', kind: 'static-import', weight: 1 },
      { path: 'src/utils/helpers.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/hooks/useForm.ts',
    linesOfCode: 90,
    bytes: 2800,
    complexity: 3,
    imports: [{ path: 'src/utils/validate.ts', kind: 'static-import', weight: 1 }],
  },
  {
    path: 'src/hooks/useTheme.ts',
    linesOfCode: 55,
    bytes: 1800,
    complexity: 2,
    imports: [{ path: 'src/styles/theme.ts', kind: 'static-import', weight: 1 }],
  },
  { path: 'src/hooks/useFocus.ts', linesOfCode: 40, bytes: 1400, complexity: 2, imports: [] },
  {
    path: 'src/utils/helpers.ts',
    linesOfCode: 110,
    bytes: 3300,
    complexity: 4,
    imports: [{ path: 'src/utils/constants.ts', kind: 'static-import', weight: 1 }],
  },
  {
    path: 'src/utils/validate.ts',
    linesOfCode: 120,
    bytes: 3600,
    complexity: 5,
    imports: [
      { path: 'src/utils/constants.ts', kind: 'static-import', weight: 1 },
      { path: 'src/utils/helpers.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/utils/format.ts',
    linesOfCode: 80,
    bytes: 2500,
    complexity: 3,
    imports: [{ path: 'src/utils/constants.ts', kind: 'static-import', weight: 1 }],
  },
  {
    path: 'src/utils/sort.ts',
    linesOfCode: 95,
    bytes: 2900,
    complexity: 4,
    imports: [
      { path: 'src/utils/helpers.ts', kind: 'static-import', weight: 1 },
      { path: 'src/utils/constants.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'src/utils/styles.ts',
    linesOfCode: 60,
    bytes: 2000,
    complexity: 2,
    imports: [
      { path: 'src/styles/theme.ts', kind: 'static-import', weight: 1 },
      { path: 'src/utils/constants.ts', kind: 'static-import', weight: 1 },
    ],
  },
  { path: 'src/utils/constants.ts', linesOfCode: 45, bytes: 1500, complexity: 1, imports: [] },
  {
    path: 'src/styles/theme.ts',
    linesOfCode: 85,
    bytes: 2600,
    complexity: 3,
    imports: [{ path: 'src/utils/constants.ts', kind: 'static-import', weight: 1 }],
  },
  {
    path: 'tests/unit/button.test.ts',
    linesOfCode: 50,
    bytes: 1600,
    complexity: 2,
    imports: [
      { path: 'src/components/Button.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/utils/helpers.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'tests/unit/form.test.ts',
    linesOfCode: 65,
    bytes: 2100,
    complexity: 2,
    imports: [
      { path: 'src/components/Form.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/hooks/useForm.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'tests/integration/app.test.ts',
    linesOfCode: 90,
    bytes: 2800,
    complexity: 3,
    imports: [
      { path: 'src/app/page.tsx', kind: 'static-import', weight: 1 },
      { path: 'src/services/api.ts', kind: 'static-import', weight: 1 },
      { path: 'src/utils/helpers.ts', kind: 'static-import', weight: 1 },
    ],
  },
  {
    path: 'tests/e2e/home.spec.ts',
    linesOfCode: 55,
    bytes: 1800,
    complexity: 2,
    imports: [{ path: 'src/app/page.tsx', kind: 'dynamic-import', weight: 0.5 }],
  },
  { path: 'docs/intro.md', linesOfCode: 80, bytes: 2600, complexity: 1, imports: [] },
  {
    path: 'docs/architecture.md',
    linesOfCode: 120,
    bytes: 3900,
    complexity: 1,
    imports: [{ path: 'docs/intro.md', kind: 'static-import', weight: 0.2 }],
  },
  {
    path: 'docs/api.md',
    linesOfCode: 100,
    bytes: 3200,
    complexity: 1,
    imports: [{ path: 'docs/intro.md', kind: 'static-import', weight: 0.2 }],
  },
];

function dirname(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx <= 0 ? '' : path.slice(0, idx);
}

function basename(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? path : path.slice(idx + 1);
}

function extension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx === -1 ? '' : name.slice(idx + 1);
}

function language(ext: string): string {
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'md':
      return 'markdown';
    default:
      return 'text';
  }
}

function deriveDistricts(modules: FixtureModule[]): District[] {
  const dirSet = new Set<string>();
  for (const m of modules) {
    let dir = dirname(m.path);
    while (dir !== '') {
      dirSet.add(dir);
      dir = dirname(dir);
    }
  }
  const dirs = Array.from(dirSet).sort();
  const byPath = new Map<string, District>();
  const districts: District[] = [
    { id: 'district:root', path: '', name: 'root', parentId: null, depth: 0 },
  ];
  for (const dir of dirs) {
    const d: District = {
      id: `district:${dir}`,
      path: dir,
      name: basename(dir),
      parentId: dir === '' ? null : `district:${dirname(dir)}`,
      depth: dir.split('/').filter(Boolean).length,
    };
    districts.push(d);
    byPath.set(dir, d);
  }
  return districts;
}

function computeLanguages(buildings: Building[]): string[] {
  const set = new Set<string>();
  for (const b of buildings) set.add(b.language);
  return Array.from(set).sort();
}

function detectCycles(roads: DependencyRoad[]): string[][] {
  const graph = new Map<string, Set<string>>();
  for (const r of roads) {
    if (!graph.has(r.sourceBuildingId)) graph.set(r.sourceBuildingId, new Set());
    graph.get(r.sourceBuildingId)?.add(r.targetBuildingId);
  }

  const visited = new Set<string>();
  const stack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(id: string, path: string[]): void {
    visited.add(id);
    stack.add(id);
    path.push(id);
    for (const next of graph.get(id) ?? []) {
      if (stack.has(next)) {
        const cycle = path.slice(path.indexOf(next));
        cycles.push([...cycle, next]);
      } else if (!visited.has(next)) {
        dfs(next, path);
      }
    }
    stack.delete(id);
    path.pop();
  }

  for (const id of graph.keys()) {
    if (!visited.has(id)) dfs(id, []);
  }

  const seen = new Set<string>();
  const unique: string[][] = [];
  for (const c of cycles) {
    const normalized = [...c].sort().join(',');
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(c);
    }
  }
  return unique;
}

export function buildDemoWorld(name = 'CodeScape Demo'): RepositoryWorld {
  const repo: Repository = {
    name,
    rootPath: '/workspace/demo',
    analyzedAt: now,
    languages: [],
  };

  const districts = deriveDistricts(rootModules);
  const districtByPath = new Map(districts.map((d) => [d.path, d]));
  const buildingByPath = new Map<string, Building>();

  for (const mod of rootModules) {
    const dir = dirname(mod.path);
    const district = districtByPath.get(dir);
    if (!district) throw new Error(`Missing district for ${mod.path}`);
    const ext = extension(mod.path);
    buildingByPath.set(mod.path, {
      id: `building:${mod.path}`,
      districtId: district.id,
      path: mod.path,
      name: basename(mod.path),
      extension: ext,
      language: language(ext),
      linesOfCode: mod.linesOfCode,
      bytes: mod.bytes,
      complexity: mod.complexity,
      importCount: 0,
      importedByCount: 0,
      lastModifiedAt: now,
    });
  }

  const roads: DependencyRoad[] = [];
  for (const mod of rootModules) {
    const source = buildingByPath.get(mod.path);
    if (!source) continue;
    for (const imp of mod.imports) {
      const target = buildingByPath.get(imp.path);
      if (!target) throw new Error(`Unknown import target ${imp.path} from ${mod.path}`);
      roads.push({
        id: `road:${source.id}->${target.id}:${imp.kind}`,
        sourceBuildingId: source.id,
        targetBuildingId: target.id,
        kind: imp.kind,
        weight: imp.weight ?? 1,
      });
      source.importCount += 1;
      target.importedByCount += 1;
    }
  }

  const buildings = rootModules
    .map((m) => buildingByPath.get(m.path))
    .filter((b): b is Building => b !== undefined);

  repo.languages = computeLanguages(buildings);

  const metrics: RepositoryMetrics = {
    totalFiles: buildings.length,
    totalDirectories: districts.length,
    totalLinesOfCode: buildings.reduce((sum, b) => sum + b.linesOfCode, 0),
    totalDependencies: roads.length,
    circularDependencyGroups: detectCycles(roads),
  };

  return {
    schemaVersion: 1,
    repository: repo,
    districts,
    buildings,
    roads,
    metrics,
  };
}
