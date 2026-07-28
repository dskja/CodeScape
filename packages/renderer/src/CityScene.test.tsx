import type { Layout } from '@codescape/layout-engine';
import type { RepositoryWorld } from '@codescape/schema';
import ReactThreeTestRenderer, { act } from '@react-three/test-renderer';
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CitySceneContent } from './CityScene.js';

const mockWorld = {
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
} as unknown as RepositoryWorld;

const mockLayout = {
  root: {
    id: 'district:root',
    district: mockWorld.districts[0],
    x: 0,
    z: 0,
    width: 10,
    depth: 10,
    children: [],
  },
  buildings: [
    {
      id: 'building:src/index.ts',
      x: 1,
      z: 1,
      width: 1,
      depth: 1,
      height: 1,
      building: mockWorld.buildings[0],
    },
  ],
  districts: [
    {
      id: 'district:root',
      district: mockWorld.districts[0],
      x: 0,
      z: 0,
      width: 10,
      depth: 10,
      children: [],
    },
    {
      id: 'district:src',
      district: mockWorld.districts[1],
      x: 0,
      z: 0,
      width: 5,
      depth: 5,
      children: [],
    },
  ],
  config: { areaScale: 60, heightScale: 0.5, padding: 1 },
} as unknown as Layout;

describe('CitySceneContent resource lifecycle', () => {
  let geometryDispose: ReturnType<typeof vi.fn>;
  let materialDispose: ReturnType<typeof vi.fn>;
  let originalGeometryDispose: () => void;
  let originalMaterialDispose: () => void;

  beforeEach(() => {
    originalGeometryDispose = THREE.BufferGeometry.prototype.dispose;
    originalMaterialDispose = THREE.Material.prototype.dispose;
    geometryDispose = vi.fn(function (this: THREE.BufferGeometry) {
      originalGeometryDispose.call(this);
    });
    materialDispose = vi.fn(function (this: THREE.Material) {
      originalMaterialDispose.call(this);
    });
    THREE.BufferGeometry.prototype.dispose = geometryDispose;
    THREE.Material.prototype.dispose = materialDispose;
  });

  afterEach(() => {
    THREE.BufferGeometry.prototype.dispose = originalGeometryDispose;
    THREE.Material.prototype.dispose = originalMaterialDispose;
  });

  it('disposes created geometries and materials on unmount', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CitySceneContent
        layout={mockLayout}
        world={mockWorld}
        selectedId={null}
        hoveredId={null}
        onSelect={() => {}}
        onHover={() => {}}
      />,
    );

    expect(geometryDispose).not.toHaveBeenCalled();
    expect(materialDispose).not.toHaveBeenCalled();

    await act(async () => {
      await renderer.unmount();
    });

    expect(geometryDispose).toHaveBeenCalled();
    expect(materialDispose).toHaveBeenCalled();
  });

  it('disposes resources on repeated mount and unmount', async () => {
    for (let i = 0; i < 3; i++) {
      const renderer = await ReactThreeTestRenderer.create(
        <CitySceneContent
          layout={mockLayout as never}
          world={mockWorld as never}
          selectedId={null}
          hoveredId={null}
          onSelect={() => {}}
          onHover={() => {}}
        />,
      );

      await act(async () => {
        await renderer.unmount();
      });
    }

    expect(geometryDispose.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(materialDispose.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
