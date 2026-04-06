export interface CameraState {
  cameraWorldX: number;
  cameraWorldY: number;
  cameraWorldZ: number;
  viewHeading: number;
  horizonOffset: number;
  lookAheadDistance: number;
}

export interface CameraParams {
  height: number;
  horizonOffset: number;
  lookAheadDistance: number;
  followDistance: number;
}

export interface CameraTelemetry {
  roadTangentAhead: number;
}

export const createInitialCameraState = (lookAheadDistance: number): CameraState => ({
  cameraWorldX: 0,
  cameraWorldY: 0,
  cameraWorldZ: 0,
  viewHeading: 0,
  horizonOffset: 0,
  lookAheadDistance
});
