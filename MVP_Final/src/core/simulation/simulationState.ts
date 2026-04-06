import type { PlaybackMode } from "../types/input";
import { createInputState, type InputState } from "../types/input";
import type { ComparisonSwitches } from "../types/debug";
import type { TrackLayout } from "../track/trackTypes";
import { createInitialPlayerState, type PlayerParams, type PlayerState } from "../player/playerTypes";
import { createInitialCameraState, type CameraParams, type CameraState } from "../camera/cameraTypes";

export interface RuntimeState {
  elapsedMs: number;
  frameId: number;
  curveStrength: number;
  playbackMode: PlaybackMode;
}

export interface SimulationParams {
  player: PlayerParams;
  camera: CameraParams;
}

export interface SimulationState {
  trackLayout: TrackLayout;
  player: PlayerState;
  camera: CameraState;
  input: InputState;
  runtime: RuntimeState;
  comparisonSwitches: ComparisonSwitches;
  params: SimulationParams;
}

export const createSimulationState = (
  trackLayout: TrackLayout,
  curveStrength: number,
  params: SimulationParams,
  comparisonSwitches: ComparisonSwitches
): SimulationState => ({
  trackLayout,
  player: createInitialPlayerState(),
  camera: createInitialCameraState(params.camera.lookAheadDistance),
  input: createInputState(),
  runtime: {
    elapsedMs: 0,
    frameId: 0,
    curveStrength,
    playbackMode: "play"
  },
  comparisonSwitches,
  params
});
