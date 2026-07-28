import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import type {
  Building,
  DependencyRoad,
  District,
  Repository,
  RepositoryMetrics,
  RepositoryWorld,
  RoadKind,
} from '@codescape/schema';

export interface ScannerOptions {
  rootPath: string;
  extensions?: string[];
  exclude?: string[];
}

interface ParsedFile {
  absolutePath: string;
  relativePath: string;
  content: string;
  extension: string;
  language: string;
  linesOfCode: number;
  bytes: number;
  complexity: number;
  imports: Array<{ specifier: string; kind: RoadKind; weight: number }>;
}

const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
const SKIP_DIRS = ['node_modules', '.git', 'dist', '.next', 'out', 'coverage'];

function getLanguage(ext: string): string {
  if (ext === 'ts' || ext === 'tsx' || ext === 'mts') return 'typescript';
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs') return 'javascript';
  if (ext === 'md' || ext === 'mdx') return 'markdown';
  return 'text';
}

function countLines(content: string): number {
  return content.split('\n').filter((line) => line.trim().length > 0).length;
}

function countComplexity(content: string): number {
  const matches = content.match(/\b(if|else|for|while|switch|case|catch|\?|\|\||&&)\b/g);
  return matches ? matches.length : 0;
}

const IMPORT_RE =
  /^\s*import\s+(?:type\s+)?(?:\*\s+as\s+\w+|\{[^}]*\}|\w+)?\s*(?:,\s*(?:\{[^}]*\}|\*\s+as\s+\w+))?\s*from\s*['"]([^'"]+)['"];?/gm;
const DYNAMIC_IMPORT_RE = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const REQUIRE_RE = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function extractImports(
  content: string,
): Array<{ specifier: string; kind: RoadKind; weight: number }> {
  const imports: Array<{ specifier: string; kind: RoadKind; weight: number }> = [];

  const staticMatches = content.matchAll(IMPORT_RE);
  for (const match of staticMatches) {
    const isType = /import\s+type\b/.test(match[0]);
    imports.push({
      specifier: match[1],
      kind: isType ? 'type-import' : 'static-import',
      weight: 1,
    });
  }

  const dynamicMatches = content.matchAll(DYNAMIC_IMPORT_RE);
  for (const match of dynamicMatches) {
    imports.push({ specifier: match[1], kind: 'dynamic-import', weight: 0.5 });
  }

  const requireMatches = content.matchAll(REQUIRE_RE);
  for (const match of requireMatches) {
    imports.push({ specifier: match[1], kind: 'require', weight: 1 });
  }

  return imports;
}

async function scanDirectory(
  rootPath: string,
  current: string,
  relativePrefix: string,
  options: ScannerOptions,
  files: ParsedFile[] = [],
): Promise<ParsedFile[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const exts = new Set(options.extensions ?? DEFAULT_EXTENSIONS);
  const exclude = new Set(options.exclude ?? []);

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(entry.name) || exclude.has(entry.name)) continue;
      await scanDirectory(rootPath, join(current, entry.name), relativePrefix, options, files);
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (!exts.has(ext) && !entry.name.endsWith('.md')) continue;
      const absolutePath = join(current, entry.name);
      const relPath = relative(rootPath, absolutePath).replace(/\\/g, '/');
      const content = await readFile(absolutePath, 'utf-8');
      const extension = ext.slice(1);
      files.push({
        absolutePath,
        relativePath: relPath,
        content,
        extension,
        language: getLanguage(extension),
        linesOfCode: countLines(content),
        bytes: Buffer.byteLength(content, 'utf-8'),
        complexity: countComplexity(content),
        imports: extractImports(content),
      });
    }
  }

  return files;
}

function resolveImportPath(
  sourcePath: string,
  specifier: string,
  filesByPath: Map<string, ParsedFile>,
): string | null {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return null;

  const baseDir = dirname(sourcePath);
  let resolved: string;
  if (specifier.startsWith('/')) {
    resolved = specifier.slice(1);
  } else {
    resolved = join(baseDir, specifier).replace(/\\/g, '/');
  }

  if (filesByPath.has(resolved)) return resolved;
  for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.mjs']) {
    const withExt = `${resolved}${ext}`;
    if (filesByPath.has(withExt)) return withExt;
    const indexFile = `${resolved}/index${ext}`;
    if (filesByPath.has(indexFile)) return indexFile;
  }

  return null;
}

function deriveDistricts(paths: string[]): District[] {
  const dirSet = new Set<string>();
  for (const p of paths) {
    let dir = dirname(p);
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

export async function analyzeTypeScriptDirectory(rootPath: string): Promise<RepositoryWorld> {
  const resolvedRoot = resolve(rootPath);
  const files = await scanDirectory(resolvedRoot, resolvedRoot, '', { rootPath: resolvedRoot });
  const filesByPath = new Map(files.map((f) => [f.relativePath, f]));

  const buildingByPath = new Map<string, Building>();
  const pathList = files.map((f) => f.relativePath).sort();
  const districts = deriveDistricts(pathList);
  const districtByPath = new Map(districts.map((d) => [d.path, d]));

  const now = new Date().toISOString();
  const repo: Repository = {
    name: basename(resolvedRoot),
    rootPath: resolvedRoot,
    analyzedAt: now,
    languages: [],
  };

  for (const file of files) {
    const dir = dirname(file.relativePath);
    const district = districtByPath.get(dir);
    if (!district) throw new Error(`Missing district for ${file.relativePath}`);
    const building: Building = {
      id: `building:${file.relativePath}`,
      districtId: district.id,
      path: file.relativePath,
      name: basename(file.relativePath),
      extension: file.extension,
      language: file.language,
      linesOfCode: file.linesOfCode,
      bytes: file.bytes,
      complexity: file.complexity,
      importCount: 0,
      importedByCount: 0,
      lastModifiedAt: now,
    };
    buildingByPath.set(file.relativePath, building);
  }

  const roads: DependencyRoad[] = [];
  for (const file of files) {
    const source = buildingByPath.get(file.relativePath);
    if (!source) continue;
    for (const imp of file.imports) {
      const resolved = resolveImportPath(file.relativePath, imp.specifier, filesByPath);
      if (!resolved) continue;
      const target = buildingByPath.get(resolved);
      if (!target) continue;
      roads.push({
        id: `road:${source.id}->${target.id}:${imp.kind}`,
        sourceBuildingId: source.id,
        targetBuildingId: target.id,
        kind: imp.kind,
        weight: imp.weight,
      });
      source.importCount += 1;
      target.importedByCount += 1;
    }
  }

  const buildings = Array.from(buildingByPath.values());
  repo.languages = Array.from(new Set(buildings.map((b) => b.language))).sort();

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
