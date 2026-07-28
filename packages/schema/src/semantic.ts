import type { RepositoryWorld } from './types.js';

export function validateRepositoryWorldSemantic(world: RepositoryWorld): string[] {
  const errors: string[] = [];

  const districtIds = new Set<string>();
  for (const district of world.districts) {
    if (districtIds.has(district.id)) {
      errors.push(`Duplicate district id: ${district.id}`);
    } else {
      districtIds.add(district.id);
    }
  }

  const rootDistricts = world.districts.filter((d) => d.parentId === null || d.parentId === '');
  if (rootDistricts.length === 0) {
    errors.push('Missing root district (district:root)');
  } else if (rootDistricts.length > 1) {
    errors.push(`More than one root district: ${rootDistricts.map((d) => d.id).join(', ')}`);
  } else if (rootDistricts[0].id !== 'district:root') {
    errors.push(`Root district must have id district:root, got ${rootDistricts[0].id}`);
  }

  const parentByDistrict = new Map<string, string | null>();
  for (const district of world.districts) {
    parentByDistrict.set(district.id, district.parentId);
  }

  // Detect district parent cycles and unreachable districts.
  for (const district of world.districts) {
    const chain: string[] = [];
    let currentId: string | null | undefined = district.id;
    let cycleDetected = false;
    while (currentId !== null && currentId !== undefined) {
      if (chain.includes(currentId)) {
        errors.push(`District parent cycle detected involving ${currentId}`);
        cycleDetected = true;
        break;
      }
      chain.push(currentId);
      if (currentId === 'district:root') {
        break;
      }
      currentId = parentByDistrict.get(currentId) ?? null;
    }
    if (!cycleDetected && currentId === null) {
      errors.push(`District ${district.id} is not reachable from the root district`);
    }
  }

  // Only the root district may be its own parent; all others must have a known parent.
  for (const district of world.districts) {
    if (district.id === 'district:root') continue;
    if (!district.parentId) {
      errors.push(`District ${district.id} has missing parentId`);
      continue;
    }
    if (!districtIds.has(district.parentId)) {
      errors.push(`District ${district.id} references unknown parent ${district.parentId}`);
    }
  }

  const buildingIds = new Set<string>();
  for (const building of world.buildings) {
    if (buildingIds.has(building.id)) {
      errors.push(`Duplicate building id: ${building.id}`);
    } else {
      buildingIds.add(building.id);
    }
    if (!districtIds.has(building.districtId)) {
      errors.push(`Building ${building.id} references unknown district ${building.districtId}`);
    }
  }

  const roadIds = new Set<string>();
  const roadKeys = new Set<string>();
  const importCountByBuilding = new Map<string, number>();
  const importedByCountByBuilding = new Map<string, number>();
  for (const road of world.roads) {
    if (roadIds.has(road.id)) {
      errors.push(`Duplicate road id: ${road.id}`);
    } else {
      roadIds.add(road.id);
    }
    if (!buildingIds.has(road.sourceBuildingId)) {
      errors.push(`Road ${road.id} references unknown source building ${road.sourceBuildingId}`);
    }
    if (!buildingIds.has(road.targetBuildingId)) {
      errors.push(`Road ${road.id} references unknown target building ${road.targetBuildingId}`);
    }
    if (road.sourceBuildingId === road.targetBuildingId) {
      errors.push(`Road ${road.id} is a self-reference which is not supported`);
    }

    const key = `${road.sourceBuildingId}|${road.targetBuildingId}|${road.kind}`;
    if (roadKeys.has(key)) {
      errors.push(
        `Duplicate road relationship ${road.sourceBuildingId} -> ${road.targetBuildingId} (${road.kind})`,
      );
    } else {
      roadKeys.add(key);
    }

    importCountByBuilding.set(
      road.sourceBuildingId,
      (importCountByBuilding.get(road.sourceBuildingId) ?? 0) + 1,
    );
    importedByCountByBuilding.set(
      road.targetBuildingId,
      (importedByCountByBuilding.get(road.targetBuildingId) ?? 0) + 1,
    );
  }

  for (const building of world.buildings) {
    const expectedImportCount = importCountByBuilding.get(building.id) ?? 0;
    if (building.importCount !== expectedImportCount) {
      errors.push(
        `Building ${building.id} importCount is ${building.importCount}, expected ${expectedImportCount}`,
      );
    }
    const expectedImportedByCount = importedByCountByBuilding.get(building.id) ?? 0;
    if (building.importedByCount !== expectedImportedByCount) {
      errors.push(
        `Building ${building.id} importedByCount is ${building.importedByCount}, expected ${expectedImportedByCount}`,
      );
    }
  }

  if (world.metrics.totalFiles !== world.buildings.length) {
    errors.push(`totalFiles is ${world.metrics.totalFiles}, expected ${world.buildings.length}`);
  }
  if (world.metrics.totalDirectories !== world.districts.length) {
    errors.push(
      `totalDirectories is ${world.metrics.totalDirectories}, expected ${world.districts.length}`,
    );
  }
  const totalLines = world.buildings.reduce((sum, b) => sum + b.linesOfCode, 0);
  if (world.metrics.totalLinesOfCode !== totalLines) {
    errors.push(`totalLinesOfCode is ${world.metrics.totalLinesOfCode}, expected ${totalLines}`);
  }
  if (world.metrics.totalDependencies !== world.roads.length) {
    errors.push(
      `totalDependencies is ${world.metrics.totalDependencies}, expected ${world.roads.length}`,
    );
  }

  const roadKeysForCycles = new Set<string>();
  for (const road of world.roads) {
    roadKeysForCycles.add(`${road.sourceBuildingId}->${road.targetBuildingId}`);
  }

  for (const group of world.metrics.circularDependencyGroups) {
    if (group.length < 2) {
      errors.push(`Cycle group has fewer than 2 entries: ${group.join(', ')}`);
      continue;
    }
    for (const id of group) {
      if (!buildingIds.has(id)) {
        errors.push(`Cycle group contains unknown building id: ${id}`);
      }
    }
    if (group[0] !== group[group.length - 1]) {
      errors.push(
        `Cycle group does not start and end with the same building: ${group.join(' -> ')}`,
      );
    }
    for (let i = 0; i < group.length - 1; i++) {
      const from = group[i];
      const to = group[i + 1];
      if (!roadKeysForCycles.has(`${from}->${to}`)) {
        errors.push(`Cycle group missing road from ${from} to ${to}`);
      }
    }
  }

  return errors;
}
