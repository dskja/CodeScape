import { describe, expect, it } from 'vitest';
import {
  type CameraCommand,
  type Point3,
  advanceCameraState,
  cancelByUser,
  computeDefaultPosition,
  computeDefaultTarget,
  computeFocusPosition,
  createCameraState,
  startCommand,
} from './cameraState.js';

const bounds = { centerX: 0, centerZ: 0, maxDimension: 10 };
const defaultPosition: Point3 = { x: 10, y: 10, z: 10 };
const defaultTarget: Point3 = { x: 0, y: 0, z: 0 };
const focusTarget: Point3 = { x: 5, y: 2, z: 3 };

function makeCommand(type: 'focus' | 'reset', target: Point3 | null, id: number): CameraCommand {
  return { type, target, id };
}

describe('cameraState', () => {
  it('creates an idle state at the default position', () => {
    const state = createCameraState(defaultPosition, defaultTarget);
    expect(state.mode).toBe('idle');
    expect(state.position).toEqual(defaultPosition);
    expect(state.target).toEqual(defaultTarget);
  });

  it('starts a focus animation', () => {
    const state = createCameraState(defaultPosition, defaultTarget);
    const completed = startCommand(
      state,
      makeCommand('focus', focusTarget, 1),
      defaultPosition,
      defaultTarget,
      false,
    );
    expect(completed).toBe(false);
    expect(state.mode).toBe('focus');
    expect(state.endPosition).toEqual(computeFocusPosition(focusTarget));
    expect(state.endTarget).toEqual(focusTarget);
  });

  it('completes a focus animation and ends in idle', () => {
    const state = createCameraState(defaultPosition, defaultTarget);
    startCommand(
      state,
      makeCommand('focus', focusTarget, 1),
      defaultPosition,
      defaultTarget,
      false,
    );

    let completed = false;
    for (let i = 0; i < 100; i++) {
      if (advanceCameraState(state, 1)) {
        completed = true;
        break;
      }
    }

    expect(completed).toBe(true);
    expect(state.mode).toBe('idle');
    expect(state.position).toEqual(computeFocusPosition(focusTarget));
    expect(state.target).toEqual(focusTarget);
  });

  it('cancels focus on user interaction and preserves position', () => {
    const state = createCameraState(defaultPosition, defaultTarget);
    startCommand(
      state,
      makeCommand('focus', focusTarget, 1),
      defaultPosition,
      defaultTarget,
      false,
    );

    advanceCameraState(state, 0.1);
    expect(state.mode).toBe('focus');

    cancelByUser(state);
    expect(state.mode).toBe('user');
    expect(advanceCameraState(state, 1)).toBe(false);
    expect(state.mode).toBe('user');
  });

  it('resets the camera to the default view', () => {
    const state = createCameraState(defaultPosition, defaultTarget);
    startCommand(
      state,
      makeCommand('focus', focusTarget, 1),
      defaultPosition,
      defaultTarget,
      false,
    );
    advanceCameraState(state, 100);
    expect(state.position).toEqual(computeFocusPosition(focusTarget));

    startCommand(state, makeCommand('reset', null, 2), defaultPosition, defaultTarget, false);
    advanceCameraState(state, 100);

    expect(state.mode).toBe('idle');
    expect(state.position).toEqual(defaultPosition);
    expect(state.target).toEqual(defaultTarget);
  });

  it('refocuses on the same building by restarting the animation', () => {
    const state = createCameraState(defaultPosition, defaultTarget);
    startCommand(
      state,
      makeCommand('focus', focusTarget, 1),
      defaultPosition,
      defaultTarget,
      false,
    );
    advanceCameraState(state, 100);

    startCommand(
      state,
      makeCommand('focus', focusTarget, 2),
      defaultPosition,
      defaultTarget,
      false,
    );
    expect(state.mode).toBe('focus');
    expect(state.progress).toBe(0);
    expect(state.lastCommandId).toBe(2);

    advanceCameraState(state, 100);
    expect(state.position).toEqual(computeFocusPosition(focusTarget));
  });

  it('snaps immediately and ends idle when reduced motion is enabled', () => {
    const state = createCameraState(defaultPosition, defaultTarget);
    const completed = startCommand(
      state,
      makeCommand('focus', focusTarget, 1),
      defaultPosition,
      defaultTarget,
      true,
    );

    expect(completed).toBe(true);
    expect(state.mode).toBe('idle');
    expect(state.position).toEqual(computeFocusPosition(focusTarget));
    expect(state.target).toEqual(focusTarget);
  });

  it('computes default position and target from bounds', () => {
    expect(computeDefaultPosition(bounds)).toEqual({ x: 10, y: 10, z: 10 });
    expect(computeDefaultTarget(bounds)).toEqual({ x: 0, y: 0, z: 0 });
  });
});
