import { buildDemoWorld } from '@codescape/fixtures';
import type { RepositoryWorld } from '@codescape/schema';
import { describe, expect, it } from 'vitest';
import {
  type DistrictLayout,
  computeLayout,
  doRectanglesOverlap,
  isRectangleInside,
} from './index.js';

function createMinimalWorld(): RepositoryWorld {
  return {
    schemaVersion: 1,
    repository: {
      name: 'tiny',
      rootPath: '/tmp/tiny',
      analyzedAt: new Date().toISOString(),
      languages: ['typescript'],
    },
    districts: [
      { id: 'district:root', path: '', name: 'root', parentId: null, depth: 0 },
      { id: 'district:src', path: 'src', name: 'src', parentId: 'district:root', depth: 1 },
    ],
    buildings: [
      {
        id: 'building:a',
        districtId: 'district:src',
        path: 'src/a.ts',
        name: 'a.ts',
        extension: 'ts',
        language: 'typescript',
        linesOfCode: 10,
        bytes: 100,
        complexity: 1,
        importCount: 0,
        importedByCount: 0,
        lastModifiedAt: new Date().toISOString(),
      },
      {
        id: 'building:b',
        districtId: 'district:src',
        path: 'src/b.ts',
        name: 'b.ts',
        extension: 'ts',
        language: 'typescript',
        linesOfCode: 20,
        bytes: 10000,
        complexity: 1,
        importCount: 0,
        importedByCount: 0,
        lastModifiedAt: new Date().toISOString(),
      },
    ],
    roads: [],
    metrics: {
      totalFiles: 2,
      totalDirectories: 2,
      totalLinesOfCode: 30,
      totalDependencies: 0,
      circularDependencyGroups: [],
    },
  };
}

describe('computeLayout', () => {
  it('is deterministic', () => {
    const world = buildDemoWorld();
    const a = computeLayout(world);
    const b = computeLayout(world);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('places buildings without overlap', () => {
    const world = buildDemoWorld();
    const layout = computeLayout(world);
    for (let i = 0; i < layout.buildings.length; i++) {
      for (let j = i + 1; j < layout.buildings.length; j++) {
        expect(doRectanglesOverlap(layout.buildings[i], layout.buildings[j])).toBe(false);
      }
    }
  });

  it('places every child inside its parent district', () => {
    const layout = computeLayout(buildDemoWorld());

    function check(layout: DistrictLayout): void {
      for (const child of layout.children) {
        expect(isRectangleInside(child, layout)).toBe(true);
        if ('children' in child) {
          check(child);
        }
      }
    }

    check(layout.root);
  });

  it('generates building heights from lines of code', () => {
    const world = createMinimalWorld();
    const layout = computeLayout(world);
    const a = layout.buildings.find((b) => b.id === 'building:a');
    const b = layout.buildings.find((b) => b.id === 'building:b');
    if (!a || !b) throw new Error('Missing building');
    expect(b.height).toBeGreaterThan(a.height);
  });

  it('larger bytes produce larger ground area', () => {
    const world = createMinimalWorld();
    const layout = computeLayout(world);
    const a = layout.buildings.find((b) => b.id === 'building:a');
    const b = layout.buildings.find((b) => b.id === 'building:b');
    if (!a || !b) throw new Error('Missing building');
    expect(a.width * a.depth).toBeLessThan(b.width * b.depth);
  });
});
