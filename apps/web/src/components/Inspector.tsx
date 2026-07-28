'use client';

import { useViewerStore } from '@/store';
import type { RepositoryWorld } from '@codescape/schema';

export function Inspector({ world }: { world: RepositoryWorld }) {
  const selectedId = useViewerStore((s) => s.selectedId);
  const building = selectedId ? world.buildings.find((b) => b.id === selectedId) : null;

  if (!building) {
    return (
      <div className="inspector-card" data-testid="inspector-empty">
        <h2>No selection</h2>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: 0 }}>
          Hover or click a building to see details.
        </p>
      </div>
    );
  }

  const incoming = world.roads.filter((r) => r.targetBuildingId === building.id);
  const outgoing = world.roads.filter((r) => r.sourceBuildingId === building.id);

  return (
    <div className="inspector-card">
      <h2>{building.name}</h2>
      <dl>
        <dt>Path</dt>
        <dd>{building.path}</dd>
        <dt>Language</dt>
        <dd>{building.language}</dd>
        <dt>Extension</dt>
        <dd>.{building.extension}</dd>
        <dt>Lines</dt>
        <dd>{building.linesOfCode.toLocaleString()}</dd>
        <dt>Size</dt>
        <dd>{building.bytes.toLocaleString()} bytes</dd>
        <dt>Complexity</dt>
        <dd>{building.complexity}</dd>
        <dt>Outgoing deps</dt>
        <dd>{outgoing.length}</dd>
        <dt>Incoming deps</dt>
        <dd>{incoming.length}</dd>
        <dt>Last modified</dt>
        <dd>{new Date(building.lastModifiedAt).toLocaleDateString()}</dd>
      </dl>
    </div>
  );
}
