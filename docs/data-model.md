# Data model

## RepositoryWorld

`RepositoryWorld` is the central serializable data structure. It is versioned and validated with Zod.

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
- `analyzedAt`: ISO 8601 timestamp
- `languages`: detected languages

### District

- `id`: unique identifier
- `path`: directory path relative to root
- `name`: directory name
- `parentId`: parent district id or `null`
- `depth`: nesting level

### Building

- `id`, `districtId`, `path`, `name`, `extension`, `language`
- `linesOfCode`: non-negative integer
- `bytes`: file size in bytes
- `complexity`: arbitrary complexity metric
- `importCount`: outgoing dependency count
- `importedByCount`: incoming dependency count
- `lastModifiedAt`: ISO 8601 timestamp

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

Use `validateRepositoryWorld(value)` from `@codescape/schema` to check a value against the Zod schema at runtime.
