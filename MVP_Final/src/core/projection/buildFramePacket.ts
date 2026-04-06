import { clamp } from "../math/scalar";
import type { TrackLayout } from "../track/trackTypes";
import type { PlayerState } from "../player/playerTypes";
import type { CameraState } from "../camera/cameraTypes";
import type { FramePacket } from "../types/framePacket";
import type { ProjectionParams } from "./projectionTypes";
import { buildVisibleBands } from "./buildVisibleBands";

const clampAngle = (value: number, limit: number): number => clamp(value, -limit, limit);

const deriveRoadHeading = (centerline: readonly { x: number; y: number }[]): number => {
  if (centerline.length < 3) {
    return 0;
  }

  const nearIndex = Math.min(2, centerline.length - 2);
  const farIndex = Math.min(8, centerline.length - 1);
  const nearPoint = centerline[nearIndex];
  const farPoint = centerline[farIndex];
  return Math.atan2(farPoint.x - nearPoint.x, Math.max(1, nearPoint.y - farPoint.y));
};

export const buildFramePacket = (
  trackLayout: TrackLayout,
  player: PlayerState,
  camera: CameraState,
  viewportWidth: number,
  viewportHeight: number,
  projectionParams: ProjectionParams
): FramePacket => {
  const visibleBands = buildVisibleBands(
    trackLayout,
    player,
    camera,
    viewportWidth,
    viewportHeight,
    projectionParams
  );
  const playerScreenY = viewportHeight * 0.82;
  const normalizedLane = clamp(player.laneOffset / projectionParams.roadHalfWidth, -1.7, 1.7);
  const horizonY = viewportHeight * (0.38 + camera.horizonOffset);
  const roadHeading = clampAngle(deriveRoadHeading(visibleBands.centerline), 0.42);
  const bodyYaw = clampAngle(
    roadHeading * 1.05 + player.headingError * 0.9 + player.slipAngle * 0.35,
    0.58
  );
  const slipYaw = clampAngle(player.slipAngle * 0.95 + player.headingError * 0.22, 0.45);
  const bodyShift =
    player.headingError * viewportWidth * 0.04 +
    player.slipAngle * viewportWidth * 0.02 +
    player.steerInput * viewportWidth * 0.015;
  const playerPose = {
    screenX: viewportWidth * 0.5 + bodyShift,
    screenY: playerScreenY,
    steerLean: clamp(player.steerInput * 0.65 + player.headingError * 0.95 + player.slipAngle * 0.45, -1, 1),
    bodyYaw,
    slipYaw,
    roadHeading,
    laneRatio: normalizedLane,
    speedReadout: player.speedForward
  };

  return {
    camera: {
      worldX: camera.cameraWorldX,
      worldY: camera.cameraWorldY,
      worldZ: camera.cameraWorldZ,
      viewHeading: camera.viewHeading,
      horizonY
    },
    roadBands: visibleBands.roadBands,
    laneBands: visibleBands.laneBands,
    roadsideInstances: [],
    playerPose,
    backgroundLayers: [
      {
        colorTop: "#10204a",
        colorBottom: "#f0ab6f",
        horizonY
      }
    ],
    debug: {
      nearFieldMode: visibleBands.nearFieldMode,
      orientationOrigin: {
        x: playerPose.screenX,
        y: playerPose.screenY - 48
      },
      centerline: visibleBands.centerline,
      leftEdge: visibleBands.leftEdge,
      rightEdge: visibleBands.rightEdge,
      sampleDots: visibleBands.sampleDots,
      seamY: visibleBands.seamY
    }
  };
};
