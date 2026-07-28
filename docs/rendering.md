# Rendering

## 3D scene

The 3D scene is implemented in `@codescape/renderer` with React Three Fiber and Three.js.

### Buildings

- One `InstancedMesh` with a unit `BoxGeometry`.
- Each instance is translated and scaled to the building's layout rectangle and height.
- Height is derived logarithmically from `linesOfCode` and clamped between `0.25` and `20`.
- Ground footprint is derived from `bytes` and clamped between `0.5` and `8`.
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
- The camera state machine has four states: `idle`, `focus`, `reset`, and `user-controlled`.
- Reset view triggers a single animation to the default framing.
- Search selection triggers a single focus animation to the chosen building.
- Direct canvas clicks select a building without moving the camera.
- `prefers-reduced-motion` snaps the camera immediately instead of animating.
- Interacting with `OrbitControls` cancels any running animation and returns control to the user.

### Empty state

When a repository contains no supported files, the web app renders an empty state and does not start a WebGL canvas.

### Lifecycle and resource management

- The canvas is loaded dynamically on the client (`ssr: false`).
- Rendering pauses via `document.visibilityState`.
- Self-created `BoxGeometry`, `PlaneGeometry`, and `BufferGeometry` resources, plus `MeshStandardMaterial` and `MeshBasicMaterial`, are explicitly `dispose()`d in effect cleanups.
- React Three Fiber disposes the meshes it creates on unmount.

## Responsive design

- The UI works from 320px width.
- Touch events are supported for selection, zoom, and reset.
- The canvas fills the viewport and resizes automatically.

## Test picking helper

When the URL query parameter `test-picking=1` is present, the renderer exposes `window.__codescapeSelectBuilding` and `window.__codescapeWorld` for deterministic end-to-end tests. This helper is not available otherwise.
