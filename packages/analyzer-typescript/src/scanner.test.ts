import { chmod, mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RepositoryWorld, RoadKind } from '@codescape/schema';
import { describe, expect, it } from 'vitest';
import { analyzeTypeScriptDirectory } from './scanner.js';

async function withTempRepo<T>(fn: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'codescape-analyzer-'));
  try {
    return await fn(root);
  } finally {
    try {
      await rm(root, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

function buildingByPath(world: RepositoryWorld, path: string) {
  return world.buildings.find((b) => b.path === path);
}

function roadsFrom(world: RepositoryWorld, source: string, target: string, kind: RoadKind) {
  return world.roads.filter(
    (r) =>
      r.sourceBuildingId === `building:${source}` &&
      r.targetBuildingId === `building:${target}` &&
      r.kind === kind,
  );
}

describe('analyzeTypeScriptDirectory', () => {
  it('analyzes a normal TypeScript repository with subdirectories', () =>
    withTempRepo(async (root) => {
      await mkdir(join(root, 'src', 'app'), { recursive: true });
      await mkdir(join(root, 'src', 'components'), { recursive: true });
      await writeFile(
        join(root, 'src', 'app', 'page.ts'),
        'import { render } from "../components/view";\nrender();',
      );
      await writeFile(join(root, 'src', 'components', 'view.ts'), 'export function render() {}');

      const { world } = await analyzeTypeScriptDirectory(root);
      expect(world.buildings.length).toBe(2);
      expect(world.districts.some((d) => d.path === 'src/app')).toBe(true);
      expect(world.districts.some((d) => d.path === 'src/components')).toBe(true);
      expect(world.roads.length).toBe(1);
      expect(world.roads[0].sourceBuildingId).toBe('building:src/app/page.ts');
      expect(world.roads[0].targetBuildingId).toBe('building:src/components/view.ts');
    }));

  it('includes files directly in the repository root', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'rootFile.ts'), 'export const x = 1;');
      const { world } = await analyzeTypeScriptDirectory(root);
      const building = buildingByPath(world, 'rootFile.ts');
      expect(building).toBeDefined();
      expect(building?.districtId).toBe('district:root');
    }));

  it('returns an empty world for an empty repository', () =>
    withTempRepo(async (root) => {
      const { world } = await analyzeTypeScriptDirectory(root);
      expect(world.buildings).toEqual([]);
      expect(world.roads).toEqual([]);
      expect(world.metrics.totalFiles).toBe(0);
      expect(world.metrics.totalDirectories).toBe(1);
      expect(world.metrics.totalLinesOfCode).toBe(0);
    }));

  it('throws for a non-existent root path', () =>
    withTempRepo(async () => {
      await expect(analyzeTypeScriptDirectory('/does/not/exist/codescape-test')).rejects.toThrow(
        /does not exist or is not readable/,
      );
    }));

  it('throws when the root path is not a directory', () =>
    withTempRepo(async (root) => {
      const file = join(root, 'not-a-dir.ts');
      await writeFile(file, '');
      await expect(analyzeTypeScriptDirectory(file)).rejects.toThrow(/not a directory/);
    }));

  it('detects side-effect imports', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'effect.ts'), 'import "./polyfill";');
      await writeFile(join(root, 'polyfill.ts'), '');
      const { world } = await analyzeTypeScriptDirectory(root);
      expect(roadsFrom(world, 'effect.ts', 'polyfill.ts', 'static-import').length).toBe(1);
    }));

  it('detects normal imports', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'a.ts'), 'import { foo } from "./b";');
      await writeFile(join(root, 'b.ts'), 'export const foo = 1;');
      const { world } = await analyzeTypeScriptDirectory(root);
      expect(world.roads.length).toBe(1);
      expect(world.roads[0].kind).toBe('static-import');
    }));

  it('detects type imports', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'a.ts'), 'import type { Foo } from "./b";');
      await writeFile(join(root, 'b.ts'), 'export type Foo = {};');
      const { world } = await analyzeTypeScriptDirectory(root);
      expect(world.roads[0].kind).toBe('type-import');
    }));

  it('detects re-exports', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'a.ts'), 'export { foo } from "./b";');
      await writeFile(join(root, 'b.ts'), 'export const foo = 1;');
      const { world } = await analyzeTypeScriptDirectory(root);
      expect(world.roads[0].kind).toBe('static-import');
    }));

  it('detects dynamic imports', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'a.ts'), 'import("./b").then((m) => m.foo());');
      await writeFile(join(root, 'b.ts'), 'export function foo() {}');
      const { world } = await analyzeTypeScriptDirectory(root);
      const road = roadsFrom(world, 'a.ts', 'b.ts', 'dynamic-import');
      expect(road.length).toBe(1);
      expect(road[0].weight).toBe(0.5);
    }));

  it('detects require calls', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'a.ts'), 'const b = require("./b");');
      await writeFile(join(root, 'b.ts'), 'module.exports = {};');
      const { world } = await analyzeTypeScriptDirectory(root);
      expect(roadsFrom(world, 'a.ts', 'b.ts', 'require').length).toBe(1);
    }));

  it('detects circular dependencies', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'a.ts'), 'import { b } from "./b";');
      await writeFile(join(root, 'b.ts'), 'import { a } from "./a"; export const b = 1;');
      const { world } = await analyzeTypeScriptDirectory(root);
      expect(world.metrics.circularDependencyGroups.length).toBeGreaterThan(0);
      const group = world.metrics.circularDependencyGroups[0];
      expect(group[0]).toBe(group[group.length - 1]);
    }));

  it('reports unresolved local imports', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'a.ts'), 'import { missing } from "./missing";');
      const { report } = await analyzeTypeScriptDirectory(root);
      expect(report.unresolvedImports.length).toBe(1);
      expect(report.unresolvedImports[0].sourcePath).toBe('a.ts');
      expect(report.unresolvedImports[0].specifier).toBe('./missing');
    }));

  it('excludes directories and files', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'included.ts'), '');
      await mkdir(join(root, 'excludedDir'));
      await writeFile(join(root, 'excludedDir', 'file.ts'), 'export const x = 1;');
      await writeFile(join(root, 'excluded.ts'), 'export const y = 1;');

      const { world } = await analyzeTypeScriptDirectory(root, {
        exclude: ['excludedDir', 'excluded.ts'],
      });
      expect(world.buildings.map((b) => b.path)).toEqual(['included.ts']);
    }));

  it('supports .mts, .cts, .mjs and .cjs extensions', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'a.mts'), 'export const a = 1;');
      await writeFile(join(root, 'b.cts'), 'export const b = 1;');
      await writeFile(join(root, 'c.mjs'), 'export const c = 1;');
      await writeFile(join(root, 'd.cjs'), 'export const d = 1;');
      const { world } = await analyzeTypeScriptDirectory(root);
      expect(world.buildings.map((b) => b.path).sort()).toEqual([
        'a.mts',
        'b.cts',
        'c.mjs',
        'd.cjs',
      ]);
      expect(world.buildings.find((b) => b.path === 'a.mts')?.language).toBe('typescript');
      expect(world.buildings.find((b) => b.path === 'c.mjs')?.language).toBe('javascript');
    }));

  it('uses real mtime from the file system', () =>
    withTempRepo(async (root) => {
      const file = join(root, 'a.ts');
      await writeFile(file, 'export const a = 1;');
      const before = Date.now();
      const { world } = await analyzeTypeScriptDirectory(root);
      const after = Date.now();
      const mtime = new Date(world.buildings[0].lastModifiedAt).getTime();
      expect(mtime).toBeGreaterThanOrEqual(before - 1000);
      expect(mtime).toBeLessThanOrEqual(after + 1000);

      const stats = await stat(file);
      expect(world.buildings[0].lastModifiedAt).toBe(stats.mtime.toISOString());
    }));

  it('skips binary files', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'binary.ts'), Buffer.from([0x00, 0x01, 0x02, 0xff]));
      const { world, report } = await analyzeTypeScriptDirectory(root);
      expect(world.buildings.length).toBe(0);
      expect(report.skippedFiles.length).toBe(1);
      expect(report.skippedFiles[0].path).toBe('binary.ts');
      expect(report.skippedFiles[0].reason).toMatch(/binary or invalid UTF-8/i);
    }));

  it('skips invalid UTF-8 files', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'invalid.ts'), Buffer.from([0xff, 0x00]));
      const { world, report } = await analyzeTypeScriptDirectory(root);
      expect(world.buildings.length).toBe(0);
      expect(report.skippedFiles.length).toBe(1);
      expect(report.skippedFiles[0].reason).toMatch(/binary or invalid UTF-8/i);
    }));

  it('deduplicates multiple relationships from the same source to the same target', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'a.ts'), 'import { foo } from "./b";\nexport { foo } from "./b";');
      await writeFile(join(root, 'b.ts'), 'export const foo = 1;');
      const { world } = await analyzeTypeScriptDirectory(root);
      const roads = roadsFrom(world, 'a.ts', 'b.ts', 'static-import');
      expect(roads.length).toBe(1);
      expect(roads[0].weight).toBe(2);
      expect(world.buildings.find((b) => b.path === 'a.ts')?.importCount).toBe(1);
      expect(world.buildings.find((b) => b.path === 'b.ts')?.importedByCount).toBe(1);
      expect(world.metrics.totalDependencies).toBe(1);
    }));

  it('keeps roads with the same source/target but different kinds separate', () =>
    withTempRepo(async (root) => {
      await writeFile(
        join(root, 'a.ts'),
        'import { foo } from "./b";\nimport type { Foo } from "./b";',
      );
      await writeFile(join(root, 'b.ts'), 'export const foo = 1;\nexport type Foo = {};');
      const { world } = await analyzeTypeScriptDirectory(root);
      expect(world.roads.length).toBe(2);
      expect(roadsFrom(world, 'a.ts', 'b.ts', 'static-import').length).toBe(1);
      expect(roadsFrom(world, 'a.ts', 'b.ts', 'type-import').length).toBe(1);
    }));

  it('resolves extensionless and index imports', () =>
    withTempRepo(async (root) => {
      await mkdir(join(root, 'src', 'utils'), { recursive: true });
      await writeFile(join(root, 'src', 'utils', 'index.ts'), 'export const util = 1;');
      await writeFile(join(root, 'src', 'main.ts'), 'import { util } from "./utils";');
      const { world } = await analyzeTypeScriptDirectory(root);
      expect(world.roads.length).toBe(1);
      expect(world.roads[0].targetBuildingId).toBe('building:src/utils/index.ts');
    }));

  it('deduplicates side-effect and normal imports to the same target', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'a.ts'), 'import "./b";\nimport { x } from "./b";');
      await writeFile(join(root, 'b.ts'), 'export const x = 1;');
      const { world } = await analyzeTypeScriptDirectory(root);
      const roads = roadsFrom(world, 'a.ts', 'b.ts', 'static-import');
      expect(roads.length).toBe(1);
      expect(roads[0].weight).toBe(2);
    }));

  it('reports unreadable subdirectories in the analyzer report', () =>
    withTempRepo(async (root) => {
      const lockedDir = join(root, 'locked');
      await mkdir(lockedDir);
      await writeFile(join(lockedDir, 'secret.ts'), 'export const secret = 1;');
      try {
        await chmod(lockedDir, 0o000);
        const { world, report } = await analyzeTypeScriptDirectory(root);
        expect(world.buildings.length).toBe(0);
        expect(report.skippedFiles.length).toBeGreaterThan(0);
        expect(report.skippedFiles[0].reason).toMatch(/not readable/);
      } finally {
        await chmod(lockedDir, 0o755);
      }
    }));
});
