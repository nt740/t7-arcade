import type { Vec2, Vec3 } from "../types/common";
import type { RoadBand, LaneBand } from "../types/framePacket";
import type { TrackLayout } from "../track/trackTypes";
import type { CameraState } from "../camera/cameraTypes";
import type { PlayerState } from "../player/playerTypes";
import type { ProjectionParams } from "./projectionTypes";
import { projectPoint } from "./projectPoint";
import { sampleTrack } from "../track/trackSampler";

const ROAD_COLOR = "#5a6270";
const ROAD_COLOR_FAR = "#606876";
const RUMBLE_COLOR_A = "#c97a5a";
const RUMBLE_COLOR_B = "#cad2bd";
const LANE_COLOR = "rgba(248, 246, 233, 0.48)";

interface ProjectedRoadSlice {
  distanceFromCamera: number;
  worldDistanceZ: number;
  center: Vec2;
  left: Vec2;
  right: Vec2;
  leftOuter: Vec2;
  rightOuter: Vec2;
}

const makeQuad = (topLeft: Vec2, topRight: Vec2, bottomRight: Vec2, bottomLeft: Vec2): [Vec2, Vec2, Vec2, Vec2] => [
  topLeft,
  topRight,
  bottomRight,
  bottomLeft
];

const buildRoadPoint = (
  centerX: number,
  centerY: number,
  worldDistanceZ: number,
  tangentHeading: number,
  offset: number
): Vec3 => {
  const normalX = Math.cos(tangentHeading);
  const normalZ = -Math.sin(tangentHeading);

  return {
    x: centerX + normalX * offset,
    y: centerY,
    z: worldDistanceZ + normalZ * offset
  };
};

const buildRoadSlice = (
  trackLayout: TrackLayout,
  camera: CameraState,
  worldDistanceZ: number,
  distanceFromCamera: number,
  viewportWidth: number,
  viewportHeight: number,
  params: ProjectionParams
): ProjectedRoadSlice | null => {
  const sample = sampleTrack(trackLayout, worldDistanceZ);
  const centerPoint = buildRoadPoint(sample.centerX, sample.centerY, worldDistanceZ, sample.tangentHeading, 0);
  const leftPoint = buildRoadPoint(sample.centerX, sample.centerY, worldDistanceZ, sample.tangentHeading, -params.roadHalfWidth);
  const rightPoint = buildRoadPoint(sample.centerX, sample.centerY, worldDistanceZ, sample.tangentHeading, params.roadHalfWidth);
  const leftOuterPoint = buildRoadPoint(
    sample.centerX,
    sample.centerY,
    worldDistanceZ,
    sample.tangentHeading,
    -(params.roadHalfWidth + params.rumbleWidth)
  );
  const rightOuterPoint = buildRoadPoint(
    sample.centerX,
    sample.centerY,
    worldDistanceZ,
    sample.tangentHeading,
    params.roadHalfWidth + params.rumbleWidth
  );

  const center = projectPoint(centerPoint, camera, viewportWidth, viewportHeight, params);
  const left = projectPoint(leftPoint, camera, viewportWidth, viewportHeight, params);
  const right = projectPoint(rightPoint, camera, viewportWidth, viewportHeight, params);
  const leftOuter = projectPoint(leftOuterPoint, camera, viewportWidth, viewportHeight, params);
  const rightOuter = projectPoint(rightOuterPoint, camera, viewportWidth, viewportHeight, params);

  return {
    distanceFromCamera,
    worldDistanceZ,
    center: center.screen,
    left: left.screen,
    right: right.screen,
    leftOuter: leftOuter.screen,
    rightOuter: rightOuter.screen
  };
};

const shouldDrawCenterStripe = (nearWorldDistanceZ: number, farWorldDistanceZ: number, params: ProjectionParams): boolean => {
  const interval = params.laneStripeLength + params.laneStripeGap;
  const nearSlot = ((nearWorldDistanceZ % interval) + interval) % interval;
  const farSlot = ((farWorldDistanceZ % interval) + interval) % interval;

  return nearSlot < params.laneStripeLength || farSlot < params.laneStripeLength;
};

const buildLaneQuad = (
  trackLayout: TrackLayout,
  camera: CameraState,
  nearWorldDistanceZ: number,
  farWorldDistanceZ: number,
  viewportWidth: number,
  viewportHeight: number,
  params: ProjectionParams
): LaneBand | null => {
  const nearSample = sampleTrack(trackLayout, nearWorldDistanceZ);
  const farSample = sampleTrack(trackLayout, farWorldDistanceZ);
  const nearLeft = projectPoint(
    buildRoadPoint(nearSample.centerX, nearSample.centerY, nearWorldDistanceZ, nearSample.tangentHeading, -params.laneStripeWidth),
    camera,
    viewportWidth,
    viewportHeight,
    params
  );
  const nearRight = projectPoint(
    buildRoadPoint(nearSample.centerX, nearSample.centerY, nearWorldDistanceZ, nearSample.tangentHeading, params.laneStripeWidth),
    camera,
    viewportWidth,
    viewportHeight,
    params
  );
  const farLeft = projectPoint(
    buildRoadPoint(farSample.centerX, farSample.centerY, farWorldDistanceZ, farSample.tangentHeading, -params.laneStripeWidth),
    camera,
    viewportWidth,
    viewportHeight,
    params
  );
  const farRight = projectPoint(
    buildRoadPoint(farSample.centerX, farSample.centerY, farWorldDistanceZ, farSample.tangentHeading, params.laneStripeWidth),
    camera,
    viewportWidth,
    viewportHeight,
    params
  );

  if (nearLeft.screen.y <= farLeft.screen.y) {
    return null;
  }

  return {
    depth: farWorldDistanceZ,
    screenQuad: makeQuad(farLeft.screen, farRight.screen, nearRight.screen, nearLeft.screen),
    styleId: LANE_COLOR
  };
};

export interface VisibleBandResult {
  roadBands: RoadBand[];
  laneBands: LaneBand[];
  nearFieldMode: "unknown" | "real" | "synthetic";
  centerline: Vec2[];
  leftEdge: Vec2[];
  rightEdge: Vec2[];
  sampleDots: Vec2[];
  seamY: number | null;
}

export const buildVisibleBands = (
  trackLayout: TrackLayout,
  _player: PlayerState,
  camera: CameraState,
  viewportWidth: number,
  viewportHeight: number,
  params: ProjectionParams
): VisibleBandResult => {
  const slices: ProjectedRoadSlice[] = [];
  let lastAcceptedY = Number.POSITIVE_INFINITY;

  for (
    let distanceFromCamera = params.nearPlane;
    distanceFromCamera <= params.drawDistance;
    distanceFromCamera += params.sampleStep
  ) {
    const worldDistanceZ = camera.cameraWorldZ + distanceFromCamera;
    const slice = buildRoadSlice(
      trackLayout,
      camera,
      worldDistanceZ,
      distanceFromCamera,
      viewportWidth,
      viewportHeight,
      params
    );

    if (!slice) {
      continue;
    }

    if (slice.center.y >= lastAcceptedY - 0.5) {
      continue;
    }

    slices.push(slice);
    lastAcceptedY = slice.center.y;

    if (slice.center.y < -viewportHeight * 0.2) {
      break;
    }
  }

  if (slices.length < 2) {
    return {
      roadBands: [],
      laneBands: [],
      nearFieldMode: "unknown",
      centerline: [],
      leftEdge: [],
      rightEdge: [],
      sampleDots: [],
      seamY: null
    };
  }

  const roadBands: RoadBand[] = [];
  const laneBands: LaneBand[] = [];

  for (let index = slices.length - 2; index >= 0; index -= 1) {
    const nearSlice = slices[index];
    const farSlice = slices[index + 1];

    if (nearSlice.center.y <= farSlice.center.y) {
      continue;
    }

    const rumbleColor = Math.floor(farSlice.worldDistanceZ / params.sampleStep) % 2 === 0 ? RUMBLE_COLOR_A : RUMBLE_COLOR_B;
    const roadColor = farSlice.distanceFromCamera > params.drawDistance * 0.65 ? ROAD_COLOR_FAR : ROAD_COLOR;

    roadBands.push(
      {
        depth: farSlice.distanceFromCamera,
        screenQuad: makeQuad(farSlice.leftOuter, farSlice.left, nearSlice.left, nearSlice.leftOuter),
        roadStyleId: rumbleColor
      },
      {
        depth: farSlice.distanceFromCamera + 0.1,
        screenQuad: makeQuad(farSlice.left, farSlice.right, nearSlice.right, nearSlice.left),
        roadStyleId: roadColor
      },
      {
        depth: farSlice.distanceFromCamera + 0.2,
        screenQuad: makeQuad(farSlice.right, farSlice.rightOuter, nearSlice.rightOuter, nearSlice.right),
        roadStyleId: rumbleColor
      }
    );

    if (shouldDrawCenterStripe(nearSlice.worldDistanceZ, farSlice.worldDistanceZ, params)) {
      const laneBand = buildLaneQuad(
        trackLayout,
        camera,
        nearSlice.worldDistanceZ,
        farSlice.worldDistanceZ,
        viewportWidth,
        viewportHeight,
        params
      );

      if (laneBand) {
        laneBands.push(laneBand);
      }
    }
  }

  const nearestSlice = slices[0];
  const nearestBottomY = Math.max(
    nearestSlice.leftOuter.y,
    nearestSlice.left.y,
    nearestSlice.center.y,
    nearestSlice.right.y,
    nearestSlice.rightOuter.y
  );
  const nearFieldMode = nearestBottomY >= viewportHeight - 1 ? "real" : "unknown";
  const centerline = slices.map((slice) => slice.center);
  const leftEdge = slices.map((slice) => slice.left);
  const rightEdge = slices.map((slice) => slice.right);
  const sampleDots = slices.map((slice) => slice.center);

  return {
    roadBands,
    laneBands,
    nearFieldMode,
    centerline,
    leftEdge,
    rightEdge,
    sampleDots,
    seamY: nearFieldMode === "real" ? null : nearestBottomY
  };
};
