import type { DependencyRoad } from '@codescape/schema';

export function detectCycles(roads: DependencyRoad[]): string[][] {
  const graph = new Map<string, Set<string>>();
  for (const r of roads) {
    if (!graph.has(r.sourceBuildingId)) graph.set(r.sourceBuildingId, new Set());
    graph.get(r.sourceBuildingId)?.add(r.targetBuildingId);
  }

  const visited = new Set<string>();
  const stack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(id: string, path: string[]): void {
    visited.add(id);
    stack.add(id);
    path.push(id);
    for (const next of graph.get(id) ?? []) {
      if (stack.has(next)) {
        const cycle = path.slice(path.indexOf(next));
        cycles.push([...cycle, next]);
      } else if (!visited.has(next)) {
        dfs(next, path);
      }
    }
    stack.delete(id);
    path.pop();
  }

  for (const id of graph.keys()) {
    if (!visited.has(id)) dfs(id, []);
  }

  const seen = new Set<string>();
  const unique: string[][] = [];
  for (const c of cycles) {
    const normalized = [...c].sort().join(',');
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(c);
    }
  }
  return unique;
}
