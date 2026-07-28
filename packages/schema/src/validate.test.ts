import { describe, expect, it } from 'vitest';
import type { RepositoryWorld } from './types.js';
import { validateRepositoryWorld } from './validate.js';

function validWorld(): RepositoryWorld {
  return {
    schemaVersion: 1,
    repository: {
      name: 'demo',
      rootPath: '/demo',
      analyzedAt: new Date().toISOString(),
      languages: ['typescript'],
    },
    districts: [
      { id: 'district:root', path: '', name: 'root', parentId: null, depth: 0 },
      { id: 'district:src', path: 'src', name: 'src', parentId: 'district:root', depth: 1 },
    ],
    buildings: [
      {
        id: 'building:src/index.ts',
        districtId: 'district:src',
        path: 'src/index.ts',
        name: 'index.ts',
        extension: 'ts',
        language: 'typescript',
        linesOfCode: 10,
        bytes: 100,
        complexity: 1,
        importCount: 0,
        importedByCount: 0,
        lastModifiedAt: new Date().toISOString(),
      },
    ],
    roads: [],
    metrics: {
      totalFiles: 1,
      totalDirectories: 2,
      totalLinesOfCode: 10,
      totalDependencies: 0,
      circularDependencyGroups: [],
    },
  };
}

function cloneWorld(world: RepositoryWorld): RepositoryWorld {
  return JSON.parse(JSON.stringify(world)) as RepositoryWorld;
}

describe('validateRepositoryWorld', () => {
  it('accepts a valid world', () => {
    const result = validateRepositoryWorld(validWorld());
    expect(result.success).toBe(true);
  });

  it('rejects a missing root district', () => {
    const world = validWorld();
    world.districts = [{ id: 'district:src', path: 'src', name: 'src', parentId: null, depth: 0 }];
    const result = validateRepositoryWorld(world);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('root'))).toBe(true);
  });

  it('rejects a building referencing an unknown district', () => {
    const world = validWorld();
    world.buildings[0].districtId = 'district:unknown';
    const result = validateRepositoryWorld(world);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('unknown district'))).toBe(true);
  });

  it('rejects incorrect metric counts', () => {
    const world = validWorld();
    world.metrics.totalFiles = 99;
    const result = validateRepositoryWorld(world);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('totalFiles'))).toBe(true);
  });

  it('rejects a self-referencing road', () => {
    const world = validWorld();
    world.buildings.push({
      ...world.buildings[0],
      id: 'building:src/other.ts',
      path: 'src/other.ts',
      name: 'other.ts',
    });
    world.roads.push({
      id: 'road:self',
      sourceBuildingId: 'building:src/index.ts',
      targetBuildingId: 'building:src/index.ts',
      kind: 'static-import',
      weight: 1,
    });
    const result = validateRepositoryWorld(world);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('self-reference'))).toBe(true);
  });

  it('rejects district parent cycles', () => {
    const world = cloneWorld(validWorld());
    world.districts.push({
      id: 'district:loop',
      path: 'loop',
      name: 'loop',
      parentId: 'district:src',
      depth: 2,
    });
    world.districts[1].parentId = 'district:loop';
    const result = validateRepositoryWorld(world);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('District parent cycle'))).toBe(true);
  });

  it('rejects districts not reachable from the root', () => {
    const world = cloneWorld(validWorld());
    world.districts.push({
      id: 'district:orphan',
      path: 'orphan',
      name: 'orphan',
      parentId: 'district:missing',
      depth: 1,
    });
    const result = validateRepositoryWorld(world);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('not reachable from the root'))).toBe(true);
  });

  it('rejects circular dependency groups that are not connected by roads', () => {
    const world = cloneWorld(validWorld());
    world.buildings.push({
      ...world.buildings[0],
      id: 'building:src/other.ts',
      path: 'src/other.ts',
      name: 'other.ts',
    });
    world.metrics.circularDependencyGroups = [
      ['building:src/index.ts', 'building:src/other.ts', 'building:src/index.ts'],
    ];
    const result = validateRepositoryWorld(world);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('missing road'))).toBe(true);
  });

  it('rejects duplicate road relationships', () => {
    const world = cloneWorld(validWorld());
    world.buildings.push({
      ...world.buildings[0],
      id: 'building:src/other.ts',
      path: 'src/other.ts',
      name: 'other.ts',
    });
    world.roads.push(
      {
        id: 'road:1',
        sourceBuildingId: 'building:src/index.ts',
        targetBuildingId: 'building:src/other.ts',
        kind: 'static-import',
        weight: 1,
      },
      {
        id: 'road:2',
        sourceBuildingId: 'building:src/index.ts',
        targetBuildingId: 'building:src/other.ts',
        kind: 'static-import',
        weight: 1,
      },
    );
    const result = validateRepositoryWorld(world);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate road relationship'))).toBe(true);
  });

  it('rejects mismatched import and importedBy counts', () => {
    const world = cloneWorld(validWorld());
    world.buildings.push({
      ...world.buildings[0],
      id: 'building:src/other.ts',
      path: 'src/other.ts',
      name: 'other.ts',
      importedByCount: 0,
    });
    world.roads.push({
      id: 'road:1',
      sourceBuildingId: 'building:src/index.ts',
      targetBuildingId: 'building:src/other.ts',
      kind: 'static-import',
      weight: 1,
    });
    const result = validateRepositoryWorld(world);
    expect(result.success).toBe(false);
    expect(
      result.errors.some((e) => e.includes('importCount') || e.includes('importedByCount')),
    ).toBe(true);
  });
});
