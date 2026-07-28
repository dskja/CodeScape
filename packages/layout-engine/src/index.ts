import type { Building, District, RepositoryWorld } from '@codescape/schema';

export interface LayoutConfig {
  /** Ground-area scale: larger values make buildings use more ground. */
  areaScale: number;
  /** Height scale: larger values make taller buildings. */
  heightScale: number;
  /** Padding between districts and buildings. */
  padding: number;
}

export interface Rectangle {
  x: number;
  z: number;
  width: number;
  depth: number;
}

export interface BuildingLayout extends Rectangle {
  id: string;
  height: number;
  building: Building;
}

export interface DistrictLayout extends Rectangle {
  id: string;
  district: District;
  children: LayoutNode[];
}

export type LayoutNode = BuildingLayout | DistrictLayout;

export interface Layout {
  root: DistrictLayout;
  buildings: BuildingLayout[];
  districts: DistrictLayout[];
  config: LayoutConfig;
}

interface PackItem {
  id: string;
  width: number;
  depth: number;
  node: LayoutNode;
}

function footprintFromBytes(bytes: number, scale: number): number {
  const raw = Math.sqrt(bytes) / scale;
  return Math.max(0.5, Math.min(raw, 8));
}

function heightFromLines(lines: number, scale: number): number {
  const raw = Math.log(lines + 1) * scale;
  return Math.max(0.25, raw);
}

function sortByName<T extends { id: string }>(items: T[]): T[] {
  return items.slice().sort((a, b) => a.id.localeCompare(b.id));
}

function packRectangles(
  items: PackItem[],
  padding: number,
): { width: number; depth: number; placements: PackItem[] } {
  const sorted = sortByName(items);
  const placements: PackItem[] = [];
  let cursorX = padding;
  let cursorZ = padding;
  let rowDepth = 0;
  let totalWidth = padding;
  let totalDepth = padding;
  const maxRowWidth = Math.max(40, Math.ceil(Math.sqrt(sorted.length)) * 10);

  for (const item of sorted) {
    const needsNewRow = cursorX + item.width + padding > maxRowWidth && cursorX > padding;
    if (needsNewRow) {
      cursorZ += rowDepth + padding;
      cursorX = padding;
      rowDepth = 0;
    }
    item.node.x = cursorX;
    item.node.z = cursorZ;
    placements.push(item);
    cursorX += item.width + padding;
    totalWidth = Math.max(totalWidth, cursorX);
    rowDepth = Math.max(rowDepth, item.depth);
    totalDepth = Math.max(totalDepth, cursorZ + rowDepth + padding);
  }

  totalDepth = Math.max(totalDepth, cursorZ + rowDepth + padding);
  return { width: totalWidth, depth: totalDepth, placements };
}

function buildDistrictLayout(
  district: District,
  world: RepositoryWorld,
  config: LayoutConfig,
  directSubdistricts: District[],
  directBuildings: Building[],
): DistrictLayout {
  const children: LayoutNode[] = [];
  const childItems: PackItem[] = [];

  for (const sub of sortByName(directSubdistricts)) {
    const subBuildings = world.buildings.filter((b) => b.districtId === sub.id);
    const subSubdistricts = world.districts.filter((d) => d.parentId === sub.id);
    const subLayout = buildDistrictLayout(sub, world, config, subSubdistricts, subBuildings);
    childItems.push({
      id: sub.id,
      width: subLayout.width,
      depth: subLayout.depth,
      node: subLayout,
    });
    children.push(subLayout);
  }

  for (const building of sortByName(directBuildings)) {
    const width = footprintFromBytes(building.bytes, config.areaScale);
    const depth = footprintFromBytes(building.bytes, config.areaScale);
    const height = heightFromLines(building.linesOfCode, config.heightScale);
    const layout: BuildingLayout = {
      id: building.id,
      x: 0,
      z: 0,
      width,
      depth,
      height,
      building,
    };
    childItems.push({ id: building.id, width, depth, node: layout });
    children.push(layout);
  }

  const packed = packRectangles(childItems, config.padding);
  const layout: DistrictLayout = {
    id: district.id,
    district,
    x: 0,
    z: 0,
    width: packed.width,
    depth: packed.depth,
    children,
  };

  return layout;
}

function makeAbsolute(layout: DistrictLayout, offsetX: number, offsetZ: number): void {
  layout.x += offsetX;
  layout.z += offsetZ;
  for (const child of layout.children) {
    child.x += layout.x;
    child.z += layout.z;
    if ('children' in child) {
      makeAbsolute(child, 0, 0);
    }
  }
}

export function computeLayout(
  world: RepositoryWorld,
  config: LayoutConfig = { areaScale: 60, heightScale: 0.5, padding: 1 },
): Layout {
  const districtById = new Map(world.districts.map((d) => [d.id, d]));
  const root = districtById.get('district:root');
  if (!root) throw new Error('Missing root district');

  const directSubdistricts = world.districts.filter((d) => d.parentId === root.id);
  const directBuildings = world.buildings.filter((b) => b.districtId === root.id);
  const rootLayout = buildDistrictLayout(root, world, config, directSubdistricts, directBuildings);
  makeAbsolute(rootLayout, 0, 0);

  const buildings: BuildingLayout[] = [];
  const districts: DistrictLayout[] = [];

  function collect(layout: DistrictLayout): void {
    districts.push(layout);
    for (const child of layout.children) {
      if ('children' in child) {
        collect(child);
      } else {
        buildings.push(child);
      }
    }
  }
  collect(rootLayout);

  return { root: rootLayout, buildings, districts, config };
}

export function doRectanglesOverlap(a: Rectangle, b: Rectangle): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.z < b.z + b.depth && a.z + a.depth > b.z;
}

export function isRectangleInside(inner: Rectangle, outer: Rectangle): boolean {
  return (
    inner.x >= outer.x &&
    inner.z >= outer.z &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.z + inner.depth <= outer.z + outer.depth
  );
}
