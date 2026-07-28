'use client';

import { useViewerStore } from '@/store';
import type { Layout } from '@codescape/layout-engine';
import type { Building, RepositoryWorld } from '@codescape/schema';
import { useMemo, useRef, useState } from 'react';

export function Search({ world, layout }: { world: RepositoryWorld; layout: Layout }) {
  const query = useViewerStore((s) => s.searchQuery);
  const setQuery = useViewerStore((s) => s.setSearchQuery);
  const setSelectedId = useViewerStore((s) => s.setSelectedId);
  const triggerFocus = useViewerStore((s) => s.triggerFocus);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const positions = useMemo(() => new Map(layout.buildings.map((b) => [b.id, b])), [layout]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return world.buildings
      .filter(
        (b: Building) => b.name.toLowerCase().includes(term) || b.path.toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [query, world.buildings]);

  const handleSelect = (building: Building) => {
    const pos = positions.get(building.id);
    if (pos) {
      triggerFocus({
        x: pos.x + pos.width / 2,
        y: pos.height / 2,
        z: pos.z + pos.depth / 2,
      });
    }
    setSelectedId(building.id);
    setQuery(building.path);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, building: Building) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(building);
    }
  };

  return (
    <div className="search-box">
      <input
        ref={inputRef}
        data-testid="search-input"
        type="search"
        placeholder="Search files..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <div className="search-results">
          {results.map((b) => (
            <button
              key={b.id}
              type="button"
              data-testid="search-result-item"
              className="search-result-item"
              onClick={() => handleSelect(b)}
              onKeyDown={(e) => handleKeyDown(e, b)}
            >
              {b.path}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
