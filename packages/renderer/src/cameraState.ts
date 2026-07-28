export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraCommand {
  type: 'focus' | 'reset';
  target: Point3 | null;
  id: number;
}

export type CameraMode = 'idle' | 'focus' | 'reset' | 'user';

export interface CameraState {
  mode: CameraMode;
  position: Point3;
  target: Point3;
  startPosition: Point3;
  startTarget: Point3;
  endPosition: Point3;
  endTarget: Point3;
  progress: number;
  lastCommandId: number;
}

export interface Bounds {
  centerX: number;
  centerZ: number;
  maxDimension: number;
}

const ANIMATION_SPEED = 2.5;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function copyPoint(p: Point3): Point3 {
  return { x: p.x, y: p.y, z: p.z };
}

function lerpPoint(a: Point3, b: Point3, t: number): Point3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function computeDefaultPosition(bounds: Bounds): Point3 {
  return {
    x: bounds.centerX + bounds.maxDimension,
    y: bounds.maxDimension,
    z: bounds.centerZ + bounds.maxDimension,
  };
}

export function computeDefaultTarget(bounds: Bounds): Point3 {
  return { x: bounds.centerX, y: 0, z: bounds.centerZ };
}

export function computeFocusPosition(target: Point3): Point3 {
  return { x: target.x + 12, y: target.y + 12, z: target.z + 12 };
}

export function createCameraState(defaultPosition: Point3, defaultTarget: Point3): CameraState {
  return {
    mode: 'idle',
    position: copyPoint(defaultPosition),
    target: copyPoint(defaultTarget),
    startPosition: copyPoint(defaultPosition),
    startTarget: copyPoint(defaultTarget),
    endPosition: copyPoint(defaultPosition),
    endTarget: copyPoint(defaultTarget),
    progress: 0,
    lastCommandId: -1,
  };
}

export function startCommand(
  state: CameraState,
  command: CameraCommand,
  defaultPosition: Point3,
  defaultTarget: Point3,
  reduced: boolean,
): boolean {
  state.lastCommandId = command.id;
  state.startPosition = copyPoint(state.position);
  state.startTarget = copyPoint(state.target);

  if (command.type === 'focus' && command.target) {
    state.endTarget = copyPoint(command.target);
    state.endPosition = computeFocusPosition(command.target);
    if (reduced) {
      state.position = copyPoint(state.endPosition);
      state.target = copyPoint(state.endTarget);
      state.mode = 'idle';
      state.progress = 1;
      return true;
    }
    state.mode = 'focus';
    state.progress = 0;
    return false;
  }

  state.endPosition = copyPoint(defaultPosition);
  state.endTarget = copyPoint(defaultTarget);
  if (reduced) {
    state.position = copyPoint(state.endPosition);
    state.target = copyPoint(state.endTarget);
    state.mode = 'idle';
    state.progress = 1;
    return true;
  }
  state.mode = 'reset';
  state.progress = 0;
  return false;
}

export function cancelByUser(state: CameraState): void {
  if (state.mode !== 'user') {
    state.mode = 'user';
  }
}

export function advanceCameraState(state: CameraState, delta: number): boolean {
  if (state.mode !== 'focus' && state.mode !== 'reset') {
    return false;
  }

  state.progress = Math.min(1, state.progress + delta * ANIMATION_SPEED);
  const t = easeOutCubic(state.progress);

  state.position = lerpPoint(state.startPosition, state.endPosition, t);
  state.target = lerpPoint(state.startTarget, state.endTarget, t);

  if (state.progress >= 1) {
    state.mode = 'idle';
    return true;
  }
  return false;
}
