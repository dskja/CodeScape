'use client';

import { useViewerStore } from '@/store';
import type { Layout } from '@codescape/layout-engine';
import type { RepositoryWorld } from '@codescape/schema';
import dynamic from 'next/dynamic';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Inspector } from './Inspector';
import { Search } from './Search';

const CityScene = dynamic(
  () => import('@codescape/renderer').then((mod) => ({ default: mod.CityScene })),
  {
    ssr: false,
    loading: () => <div style={{ color: '#9ca3af', padding: '1rem' }}>Loading 3D scene...</div>,
  },
);

export function Viewer({ world, layout }: { world: RepositoryWorld; layout: Layout }) {
  const selectedId = useViewerStore((s) => s.selectedId);
  const hoveredId = useViewerStore((s) => s.hoveredId);
  const cameraCommand = useViewerStore((s) => s.cameraCommand);
  const setSelectedId = useViewerStore((s) => s.setSelectedId);
  const setHoveredId = useViewerStore((s) => s.setHoveredId);
  const resetView = useViewerStore((s) => s.resetView);
  const clearCameraCommand = useViewerStore((s) => s.clearCameraCommand);
  const [testPicking, setTestPicking] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTestPicking(window.location.search.includes('test-picking=1'));
    }
  }, []);

  const handleSelect = useCallback(
    (id: string | null) => {
      setSelectedId(id);
    },
    [setSelectedId],
  );

  const handleHover = useCallback(
    (id: string | null) => {
      setHoveredId(id);
    },
    [setHoveredId],
  );

  if (world.buildings.length === 0) {
    return (
      <div className="viewer">
        <div data-testid="empty-state" className="empty-state">
          <h1>CodeScape</h1>
          <p>This repository contains no supported files to visualize.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="viewer">
      <div className="canvas-container">
        <Suspense
          fallback={<div style={{ color: '#9ca3af', padding: '1rem' }}>Loading 3D scene...</div>}
        >
          <CityScene
            layout={layout}
            world={world}
            selectedId={selectedId}
            hoveredId={hoveredId}
            cameraCommand={cameraCommand}
            testPicking={testPicking}
            onSelect={handleSelect}
            onHover={handleHover}
            onAnimationComplete={clearCameraCommand}
          />
        </Suspense>
      </div>
      <div className="ui-overlay">
        <header className="ui-header">
          <h1 style={{ margin: 0, fontSize: '1rem', flexShrink: 0 }}>CodeScape</h1>
          <Search world={world} layout={layout} />
          <button
            type="button"
            data-testid="reset-view-button"
            className="reset-button"
            onClick={resetView}
          >
            Reset view
          </button>
        </header>
        <main className="ui-main" aria-hidden="true" />
        <aside className="ui-inspector">
          <Inspector world={world} />
        </aside>
      </div>
    </div>
  );
}
