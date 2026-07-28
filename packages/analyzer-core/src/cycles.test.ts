import { describe, expect, it } from 'vitest';
import { detectCycles } from './cycles.js';

describe('detectCycles', () => {
  it('returns empty array when there are no roads', () => {
    expect(detectCycles([])).toEqual([]);
  });

  it('detects a simple cycle', () => {
    const roads = [
      { sourceBuildingId: 'a', targetBuildingId: 'b' },
      { sourceBuildingId: 'b', targetBuildingId: 'c' },
      { sourceBuildingId: 'c', targetBuildingId: 'a' },
    ] as const;
    const cycles = detectCycles(
      roads.map((r) => ({
        id: `road:${r.sourceBuildingId}->${r.targetBuildingId}:static-import`,
        ...r,
        kind: 'static-import' as const,
        weight: 1,
      })),
    );
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0][0]).toBe('a');
  });
});
