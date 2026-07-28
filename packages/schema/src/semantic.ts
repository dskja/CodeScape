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
  const sourceToTarget = new Map<string, Set<string>>();
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
    if (!sourceToTarget.has(road.sourceBuildingId))
      sourceToTarget.set(road.sourceBuildingId, new Set());
    sourceToTarget.get(road.sourceBuildingId)?.add(road.targetBuildingId);
  }

  for (const building of world.buildings) {
    const expectedImportCount = world.roads.filter(
      (r) => r.sourceBuildingId === building.id,
    ).length;
    if (building.importCount !== expectedImportCount) {
      errors.push(
        `Building ${building.id} importCount is ${building.importCount}, expected ${expectedImportCount}`,
      );
    }
    const expectedImportedByCount = world.roads.filter(
      (r) => r.targetBuildingId === building.id,
    ).length;
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
  }

  return errors;
}
