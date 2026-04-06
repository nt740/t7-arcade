import type { ProjectionParams } from "../core/projection/projectionTypes";
import type { CameraParams } from "../core/camera/cameraTypes";
import type { PlayerParams } from "../core/player/playerTypes";
import type { FixedStepOptions } from "../core/simulation/fixedStep";

export interface RuntimeConfig {
  buildId: string;
  segmentLength: number;
  curveStrength: {
    min: number;
    max: number;
    step: number;
    defaultValue: number;
  };
  player: PlayerParams;
  camera: CameraParams;
  projection: ProjectionParams;
  fixedStep: FixedStepOptions;
}

export const runtimeConfig: RuntimeConfig = {
  buildId: "RoadLab v0.5-road-relative-steer",
  segmentLength: 40,
  curveStrength: {
    min: 0.5,
    max: 12,
    step: 0.1,
    defaultValue: 3
  },
  player: {
    maxSpeed: 320,
    acceleration: 120,
    brakeForce: 180,
    drag: 0.8,
    offroadDrag: 120,
    steerResponse: 10,
    steerReturnRate: 7,
    steerLateralAccel: 380,
    centrifugalAccel: 82000,
    lateralDrag: 3.8,
    lateralNeutralDrag: 2.4,
    lateralStraightDrag: 3.6,
    brakeLateralDrag: 2.8,
    headingVisualResponse: 8,
    headingFromSteer: 0.34,
    headingFromLateral: 0.3,
    headingFromCurve: 0.26,
    slipResponse: 8,
    slipFromLateral: 0.42,
    slipFromCurve: 0.16,
    slipNeutralRecovery: 2.8,
    slipStraightRecovery: 2.4,
    drivableHalfWidth: 92,
    laneClamp: 180,
    maxHeadingError: 0.52,
    maxSlipAngle: 0.32,
    straightCurveEpsilon: 0.000025
  },
  camera: {
    height: 48,
    horizonOffset: -0.02,
    lookAheadDistance: 220,
    followDistance: 20
  },
  projection: {
    nearPlane: 8,
    fieldOfView: 900,
    drawDistance: 2600,
    sampleStep: 10,
    roadHalfWidth: 120,
    rumbleWidth: 18,
    laneStripeWidth: 6,
    laneStripeLength: 90,
    laneStripeGap: 60
  },
  fixedStep: {
    fixedDeltaSeconds: 1 / 60,
    maxCatchUpSteps: 4
  }
};
