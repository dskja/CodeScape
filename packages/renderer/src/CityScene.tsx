import type { BuildingLayout, DistrictLayout, Layout } from '@codescape/layout-engine';
import type { RepositoryWorld, RoadKind } from '@codescape/schema';
import { OrbitControls } from '@react-three/drei';
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

export interface CitySceneProps {
  layout: Layout;
  world: RepositoryWorld;
  selectedId: string | null;
  hoveredId: string | null;
  focusTarget: { x: number; y: number; z: number } | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

interface OrbitControlsLike {
  object: { position: THREE.Vector3 };
  target: THREE.Vector3;
  update(): void;
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

interface Bounds {
  centerX: number;
  centerZ: number;
  maxDimension: number;
}

function computeBounds(layout: Layout): Bounds {
  const minX = Math.min(...layout.buildings.map((b) => b.x));
  const maxX = Math.max(...layout.buildings.map((b) => b.x + b.width));
  const minZ = Math.min(...layout.buildings.map((b) => b.z));
  const maxZ = Math.max(...layout.buildings.map((b) => b.z + b.depth));
  const width = maxX - minX;
  const depth = maxZ - minZ;
  return {
    centerX: minX + width / 2,
    centerZ: minZ + depth / 2,
    maxDimension: Math.max(width, depth, 10),
  };
}

function CameraRig({
  focusTarget,
  bounds,
}: {
  focusTarget: { x: number; y: number; z: number } | null;
  bounds: Bounds;
}) {
  const controls = useThree((state) => state.controls);
  const reduced = useReducedMotion();
  const defaultPosition = useMemo(
    () =>
      new THREE.Vector3(
        bounds.centerX + bounds.maxDimension,
        bounds.maxDimension,
        bounds.centerZ + bounds.maxDimension,
      ),
    [bounds],
  );
  const defaultTarget = useMemo(
    () => new THREE.Vector3(bounds.centerX, 0, bounds.centerZ),
    [bounds],
  );
  const targetPosition = useMemo(() => {
    if (focusTarget) {
      return new THREE.Vector3(focusTarget.x + 12, focusTarget.y + 12, focusTarget.z + 12);
    }
    return defaultPosition.clone();
  }, [focusTarget, defaultPosition]);
  const targetLookAt = useMemo(() => {
    if (focusTarget) {
      return new THREE.Vector3(focusTarget.x, focusTarget.y, focusTarget.z);
    }
    return defaultTarget.clone();
  }, [focusTarget, defaultTarget]);

  useFrame((_, delta) => {
    if (!controls) return;
    const oc = controls as unknown as OrbitControlsLike;
    const speed = reduced ? 1 : Math.min(delta * 4, 1);
    oc.object.position.lerp(targetPosition, speed);
    oc.target.lerp(targetLookAt, speed);
    oc.update();
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

export function CityScene({
  layout,
  world,
  selectedId,
  hoveredId,
  focusTarget,
  onSelect,
  onHover,
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
        <CameraRig focusTarget={focusTarget} bounds={bounds} />
      </Canvas>
    </div>
  );
}
