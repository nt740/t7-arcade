import { damp } from "../math/scalar";
import { sampleTrack } from "../track/trackSampler";
import type { TrackLayout, TrackSample } from "../track/trackTypes";
import type { CameraParams, CameraState, CameraTelemetry } from "./cameraTypes";
import type { PlayerState } from "../player/playerTypes";

export const stepCamera = (
  camera: CameraState,
  player: PlayerState,
  roadSample: TrackSample,
  trackLayout: TrackLayout,
  deltaSeconds: number,
  params: CameraParams,
  enableLookAhead: boolean,
  enableYawSmoothing: boolean
): { camera: CameraState; telemetry: CameraTelemetry } => {
  const aheadSample = sampleTrack(trackLayout, player.distanceZ + params.lookAheadDistance);
  const lookAheadDx = aheadSample.centerX - roadSample.centerX;
  const roadTangentAhead = Math.atan2(lookAheadDx, params.lookAheadDistance);
  const targetHeading = enableLookAhead ? Math.max(-0.55, Math.min(0.55, roadTangentAhead * 0.45)) : 0;
  const viewHeading = enableYawSmoothing ? damp(camera.viewHeading, targetHeading, 8, deltaSeconds) : targetHeading;

  return {
    camera: {
      cameraWorldX: roadSample.centerX + player.laneOffset,
      cameraWorldY: roadSample.centerY + params.height,
      cameraWorldZ: player.distanceZ - params.followDistance,
      viewHeading,
      horizonOffset: params.horizonOffset,
      lookAheadDistance: params.lookAheadDistance
    },
    telemetry: {
      roadTangentAhead
    }
  };
};
