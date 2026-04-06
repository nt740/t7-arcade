import type { Vec3 } from "../types/common";
import type { CameraState } from "../camera/cameraTypes";
import type { ProjectedPoint, ProjectionParams } from "./projectionTypes";

export const projectPoint = (
  point: Vec3,
  camera: CameraState,
  viewportWidth: number,
  viewportHeight: number,
  params: ProjectionParams
): ProjectedPoint => {
  const dx = point.x - camera.cameraWorldX;
  const dy = point.y - camera.cameraWorldY;
  const dz = point.z - camera.cameraWorldZ;
  const sinHeading = Math.sin(camera.viewHeading);
  const cosHeading = Math.cos(camera.viewHeading);
  const viewX = dx * cosHeading - dz * sinHeading;
  const viewZ = dz * cosHeading + dx * sinHeading;
  const clipped = viewZ <= params.nearPlane;
  const safeZ = clipped ? params.nearPlane : viewZ;
  const scale = params.fieldOfView / safeZ;
  const horizonY = viewportHeight * (0.38 + camera.horizonOffset);

  return {
    world: point,
    screen: {
      x: viewportWidth * 0.5 + viewX * scale,
      y: horizonY - dy * scale
    },
    scale,
    clipped
  };
};
