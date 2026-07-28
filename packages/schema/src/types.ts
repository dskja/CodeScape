import { z } from 'zod';

export const roadKindSchema = z.enum(['static-import', 'dynamic-import', 'require', 'type-import']);

export const districtSchema = z.object({
  id: z.string(),
  path: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  depth: z.number().int().nonnegative(),
});

export const buildingSchema = z.object({
  id: z.string(),
  districtId: z.string(),
  path: z.string(),
  name: z.string(),
  extension: z.string(),
  language: z.string(),
  linesOfCode: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
  complexity: z.number().int().nonnegative(),
  importCount: z.number().int().nonnegative(),
  importedByCount: z.number().int().nonnegative(),
  lastModifiedAt: z.string().datetime(),
});

export const dependencyRoadSchema = z.object({
  id: z.string(),
  sourceBuildingId: z.string(),
  targetBuildingId: z.string(),
  kind: roadKindSchema,
  weight: z.number().nonnegative(),
});

export const repositoryMetricsSchema = z.object({
  totalFiles: z.number().int().nonnegative(),
  totalDirectories: z.number().int().nonnegative(),
  totalLinesOfCode: z.number().int().nonnegative(),
  totalDependencies: z.number().int().nonnegative(),
  circularDependencyGroups: z.array(z.array(z.string())),
});

export const repositorySchema = z.object({
  name: z.string(),
  rootPath: z.string(),
  analyzedAt: z.string().datetime(),
  languages: z.array(z.string()),
});

export const repositoryWorldSchema = z.object({
  schemaVersion: z.literal(1),
  repository: repositorySchema,
  districts: z.array(districtSchema),
  buildings: z.array(buildingSchema),
  roads: z.array(dependencyRoadSchema),
  metrics: repositoryMetricsSchema,
});

export type RoadKind = z.infer<typeof roadKindSchema>;
export type District = z.infer<typeof districtSchema>;
export type Building = z.infer<typeof buildingSchema>;
export type DependencyRoad = z.infer<typeof dependencyRoadSchema>;
export type RepositoryMetrics = z.infer<typeof repositoryMetricsSchema>;
export type Repository = z.infer<typeof repositorySchema>;
export type RepositoryWorld = z.infer<typeof repositoryWorldSchema>;
