# Rendering

## 3D scene

The 3D scene is implemented in `@codescape/renderer` with React Three Fiber and Three.js.

### Buildings

- One `InstancedMesh` with a unit `BoxGeometry`.
- Each instance is translated and scaled to the building's layout rectangle and height.
- Height is derived logarithmically from `linesOfCode`.
- Ground footprint is derived from `bytes`.
- Color is determined by language.
- Hover brightens the building; selection tints it red.

### Districts

- Instanced transparent planes show district boundaries on the ground.

### Roads

- `LineSegments` connect source and target building centers.
- The line starts at the source building roof and ends at the target building roof, then drops to the ground.

### Camera and controls

- Default view is positioned above the scene center.
- `OrbitControls` enables rotate, zoom, and pan.
- Reset view returns to the default position.
- Camera focus animates to a building when selected from search.
- `prefers-reduced-motion` disables camera smoothing.

### Lifecycle

- The canvas is loaded dynamically on the client (`ssr: false`).
- Rendering pauses via `document.visibilityState`.
- React Three Fiber disposes WebGL resources on unmount.

## Responsive design

- The UI works from 320px width.
- Touch events are supported for selection, zoom, and reset.
- The canvas fills the viewport and resizes automatically.
