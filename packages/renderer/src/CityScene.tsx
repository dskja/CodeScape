import type { BuildingLayout, DistrictLayout, Layout } from '@codescape/layout-engine';
import type { RepositoryWorld, RoadKind } from '@codescape/schema';
import { OrbitControls } from '@react-three/drei';
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  type Bounds,
  type CameraState,
  type Point3,
  advanceCameraState,
  cancelByUser,
  computeDefaultPosition,
  computeDefaultTarget,
  createCameraState,
  startCommand,
} from './cameraState.js';

export interface FocusTarget {
  x: number;
  y: number;
  z: number;
}

export interface CameraCommand {
  type: 'focus' | 'reset';
  target: FocusTarget | null;
  id: number;
}

export interface CitySceneProps {
  layout: Layout;
  world: RepositoryWorld;
  selectedId: string | null;
  hoveredId: string | null;
  cameraCommand: CameraCommand | null;
  testPicking?: boolean;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onAnimationComplete?: () => void;
}

export interface CitySceneContentProps {
  layout: Layout;
  world: RepositoryWorld;
  selectedId: string | null;
  hoveredId: string | null;
  testPicking?: boolean;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

declare global {
  interface Window {
    __codescapeSelectBuilding?: (id: string | null) => void;
    __codescapeWorld?: RepositoryWorld;
  }
}

function languageColor(language: string): THREE.Color {
  const palette: Record<string, number> = {
    typescript: 0x3178c6,
    javascript: 0xf7df1e,
    markdown: 0x808080,
    text: 0xa0a0a0,
  };
  return new THREE.Color(palette[language] ?? 0x888888);
}

const SELECTED_COLOR = new THREE.Color(0xff6b6b);
const HOVER_COLOR = new THREE.Color(0x4ecdc4);

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);
  return visible;
}

function computeBounds(layout: Layout): Bounds {
  let minX: number;
  let maxX: number;
  let minZ: number;
  let maxZ: number;

  if (layout.buildings.length > 0) {
    minX = Math.min(...layout.buildings.map((b) => b.x));
    maxX = Math.max(...layout.buildings.map((b) => b.x + b.width));
    minZ = Math.min(...layout.buildings.map((b) => b.z));
    maxZ = Math.max(...layout.buildings.map((b) => b.z + b.depth));
  } else if (layout.root) {
    minX = layout.root.x;
    maxX = layout.root.x + Math.max(layout.root.width, 10);
    minZ = layout.root.z;
    maxZ = layout.root.z + Math.max(layout.root.depth, 10);
  } else {
    minX = -5;
    maxX = 5;
    minZ = -5;
    maxZ = 5;
  }

  const width = maxX - minX;
  const depth = maxZ - minZ;
  return {
    centerX: minX + width / 2,
    centerZ: minZ + depth / 2,
    maxDimension: Math.max(width, depth, 10),
  };
}

function copyToVector(target: THREE.Vector3, point: Point3): void {
  target.set(point.x, point.y, point.z);
}

interface OrbitControlsLike {
  object: THREE.PerspectiveCamera;
  target: THREE.Vector3;
  addEventListener(type: 'start', listener: () => void): void;
  removeEventListener(type: 'start', listener: () => void): void;
  update(): void;
}

function CameraRig({
  cameraCommand,
  bounds,
  onAnimationComplete,
}: {
  cameraCommand: CameraCommand | null;
  bounds: Bounds;
  onAnimationComplete: () => void;
}) {
  const controls = useThree((state) => state.controls) as unknown as OrbitControlsLike | undefined;
  const camera = useThree((state) => state.camera);
  const reduced = useReducedMotion();

  const defaultPosition = useMemo(() => computeDefaultPosition(bounds), [bounds]);
  const defaultTarget = useMemo(() => computeDefaultTarget(bounds), [bounds]);

  const cameraState = useRef<CameraState>(createCameraState(defaultPosition, defaultTarget));

  // Sync the plain state with the actual camera position on first mount.
  useEffect(() => {
    const state = cameraState.current;
    state.position = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    state.target = {
      x: controls?.target.x ?? 0,
      y: controls?.target.y ?? 0,
      z: controls?.target.z ?? 0,
    };
  }, [camera, controls]);

  useEffect(() => {
    if (!controls) return;
    const handler = () => {
      cancelByUser(cameraState.current);
      onAnimationComplete();
    };
    controls.addEventListener('start', handler);
    return () => controls.removeEventListener('start', handler);
  }, [controls, onAnimationComplete]);

  useEffect(() => {
    if (!cameraCommand) return;
    const completed = startCommand(
      cameraState.current,
      cameraCommand,
      defaultPosition,
      defaultTarget,
      reduced,
    );
    if (completed) {
      copyToVector(camera.position, cameraState.current.position);
      controls?.target.set(
        cameraState.current.target.x,
        cameraState.current.target.y,
        cameraState.current.target.z,
      );
      controls?.update();
      onAnimationComplete();
      return;
    }

    cameraState.current.startPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };
    cameraState.current.startTarget = {
      x: controls?.target.x ?? defaultTarget.x,
      y: controls?.target.y ?? defaultTarget.y,
      z: controls?.target.z ?? defaultTarget.z,
    };
  }, [
    cameraCommand,
    camera,
    controls,
    reduced,
    defaultPosition,
    defaultTarget,
    onAnimationComplete,
  ]);

  useFrame((_, delta) => {
    if (!controls) return;
    const completed = advanceCameraState(cameraState.current, delta);
    if (cameraState.current.mode === 'focus' || cameraState.current.mode === 'reset') {
      copyToVector(camera.position, cameraState.current.position);
      copyToVector(controls.target, cameraState.current.target);
      controls.update();
    }
    if (completed) {
      onAnimationComplete();
    }
  });

  return <OrbitControls makeDefault enableDamping />;
}

function BuildingInstances({
  buildings,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  buildings: BuildingLayout[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.6, metalness: 0.1 }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      dummy.position.set(b.x + b.width / 2, b.height / 2, b.z + b.depth / 2);
      dummy.scale.set(b.width, b.height, b.depth);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const base = languageColor(b.building.language);
      const color = b.id === selectedId ? SELECTED_COLOR : b.id === hoveredId ? HOVER_COLOR : base;
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [buildings, selectedId, hoveredId, dummy]);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId === undefined) return;
    onHover(buildings[e.instanceId]?.id ?? null);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      onSelect(buildings[e.instanceId]?.id ?? null);
    }
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: 3D objects use pointer interaction
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, buildings.length]}
      onPointerMove={handlePointerMove}
      onPointerOut={() => onHover(null)}
      onClick={handleClick}
    />
  );
}

function DistrictPlanes({ districts }: { districts: DistrictLayout[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < districts.length; i++) {
      const d = districts[i];
      dummy.position.set(d.x + d.width / 2, 0.01, d.z + d.depth / 2);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(d.width, d.depth, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [districts, dummy]);

  return <instancedMesh ref={meshRef} args={[geometry, material, districts.length]} />;
}

function Roads({ layout, world }: { layout: Layout; world: RepositoryWorld }) {
  const buildingById = useMemo(() => new Map(layout.buildings.map((b) => [b.id, b])), [layout]);
  const points = useMemo(() => {
    const positions: number[] = [];
    for (const road of world.roads) {
      const source = buildingById.get(road.sourceBuildingId);
      const target = buildingById.get(road.targetBuildingId);
      if (!source || !target) continue;
      const kindHeight: Record<RoadKind, number> = {
        'static-import': source.height + 0.2,
        'dynamic-import': source.height + 0.5,
        require: source.height + 0.1,
        'type-import': source.height + 0.8,
      };
      const sy = kindHeight[road.kind];
      const tx = target.x + target.width / 2;
      const tz = target.z + target.depth / 2;
      const sx = source.x + source.width / 2;
      const sz = source.z + source.depth / 2;
      positions.push(sx, sy, sz, tx, sy, tz, tx, sy, tz, tx, 0.1, tz);
    }
    return new Float32Array(positions);
  }, [world, buildingById]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(points, 3));
    return geo;
  }, [points]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={0xaaaaaa} transparent opacity={0.4} />
    </lineSegments>
  );
}

function GroundPlane({ onSelect }: { onSelect: (id: string | null) => void }) {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: 3D objects use pointer interaction
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} onClick={() => onSelect(null)}>
      <planeGeometry args={[1000, 1000]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

export function CitySceneContent({
  layout,
  world,
  selectedId,
  hoveredId,
  testPicking = false,
  onSelect,
  onHover,
}: CitySceneContentProps) {
  // Test-only deterministic picking helper.
  useEffect(() => {
    if (!testPicking) return undefined;
    window.__codescapeSelectBuilding = onSelect;
    window.__codescapeWorld = world;
    return () => {
      window.__codescapeSelectBuilding = undefined;
      window.__codescapeWorld = undefined;
    };
  }, [testPicking, onSelect, world]);

  return (
    <group>
      <GroundPlane onSelect={onSelect} />
      <DistrictPlanes districts={layout.districts} />
      <BuildingInstances
        buildings={layout.buildings}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onSelect={onSelect}
        onHover={onHover}
      />
      <Roads layout={layout} world={world} />
    </group>
  );
}

export function CityScene({
  layout,
  world,
  selectedId,
  hoveredId,
  cameraCommand,
  testPicking = false,
  onSelect,
  onHover,
  onAnimationComplete,
}: CitySceneProps) {
  const bounds = useMemo(() => computeBounds(layout), [layout]);
  const visible = usePageVisible();

  return (
    <div data-testid="city-canvas" style={{ width: '100%', height: '100%' }}>
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        camera={{
          position: [
            bounds.centerX + bounds.maxDimension,
            bounds.maxDimension,
            bounds.centerZ + bounds.maxDimension,
          ],
          fov: 50,
        }}
        onPointerMissed={() => onSelect(null)}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={[0x111827]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[20, 40, 20]} intensity={1} />
        <CitySceneContent
          layout={layout}
          world={world}
          selectedId={selectedId}
          hoveredId={hoveredId}
          testPicking={testPicking}
          onSelect={onSelect}
          onHover={onHover}
        />
        <CameraRig
          cameraCommand={cameraCommand}
          bounds={bounds}
          onAnimationComplete={onAnimationComplete ?? (() => {})}
        />
      </Canvas>
    </div>
  );
}
