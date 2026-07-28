# Data model

## RepositoryWorld

`RepositoryWorld` is the central serializable data structure. It is versioned and validated with Zod, including semantic validation on top of the structural schema.

```typescript
interface RepositoryWorld {
  schemaVersion: 1;
  repository: Repository;
  districts: District[];
  buildings: Building[];
  roads: DependencyRoad[];
  metrics: RepositoryMetrics;
}
```

## Entities

### Repository

- `name`: human-readable name
- `rootPath`: absolute path of the analyzed root
- `analyzedAt`: ISO 8601 timestamp of the analysis
- `languages`: detected languages

### District

- `id`: unique identifier
- `path`: directory path relative to root, using `/` and empty for root
- `name`: directory name
- `parentId`: parent district id or `null` for the single root
- `depth`: nesting level

### Building

- `id`, `districtId`, `path`, `name`, `extension`, `language`
- `linesOfCode`: non-negative integer
- `bytes`: file size in bytes from `stat`
- `complexity`: arbitrary complexity metric
- `importCount`: outgoing dependency count
- `importedByCount`: incoming dependency count
- `lastModifiedAt`: ISO 8601 timestamp from the file `mtime`

### DependencyRoad

- `id`, `sourceBuildingId`, `targetBuildingId`
- `kind`: `static-import`, `dynamic-import`, `require`, `type-import`
- `weight`: non-negative number

### RepositoryMetrics

- `totalFiles`
- `totalDirectories`
- `totalLinesOfCode`
- `totalDependencies`
- `circularDependencyGroups`: array of cycles as building id arrays

## Validation

`validateRepositoryWorld(value)` from `@codescape/schema` first checks the Zod structural schema and then runs semantic validation:

- Duplicate district, building, and road ids
- Presence and uniqueness of `district:root`
- Valid district parent references and no parent cycles
- Buildings reference existing districts
- Roads reference existing source and target buildings
- No self-references (they are not supported in this release)
- Metric counts match actual entity counts and line-of-code totals
- `importCount` and `importedByCount` match outgoing and incoming road counts
- Cycle groups reference only known building ids and start and end with the same id

Errors include concrete ids or paths where applicable.

## Analysis report

`AnalyzerResult` from `@codescape/analyzer-core` contains both the `RepositoryWorld` and an `AnalyzerReport`:

```typescript
interface AnalyzerReport {
  unresolvedImports: Array<{ sourcePath: string; specifier: string; kind: string }>;
  skippedFiles: Array<{ path: string; reason: string }>;
}
```

The report is separate from `RepositoryWorld` so it does not affect schema validation.
