import { clamp } from "../math/scalar";
import type { InputState } from "../types/input";
import type { ComparisonSwitches } from "../types/debug";
import type { TrackSample } from "../track/trackTypes";
import type { PlayerParams, PlayerState, PlayerTelemetry } from "./playerTypes";

const blendToward = (current: number, target: number, rate: number, deltaSeconds: number): number =>
  current + (target - current) * Math.min(1, rate * deltaSeconds);

export const stepPlayer = (
  player: PlayerState,
  input: InputState,
  comparisons: ComparisonSwitches,
  roadSample: TrackSample,
  deltaSeconds: number,
  params: PlayerParams
): { player: PlayerState; telemetry: PlayerTelemetry } => {
  const throttleInput = input.throttlePressed ? 1 : 0;
  const brakeInput = input.brakePressed ? 1 : 0;
  const rawSteer = clamp(input.steerAxis, -1, 1);
  const steerResponseRate = rawSteer === 0 ? params.steerReturnRate : params.steerResponse;
  const steerInput = blendToward(player.steerInput, rawSteer, steerResponseRate, deltaSeconds);
  const previousOffroad = Math.abs(player.laneOffset) > params.drivableHalfWidth;
  const offroadScrub = previousOffroad ? params.offroadDrag * (0.45 + player.speedForward / params.maxSpeed) : 0;
  const acceleration =
    throttleInput * params.acceleration -
    brakeInput * params.brakeForce -
    player.speedForward * params.drag -
    offroadScrub;
  const speedForward = clamp(player.speedForward + acceleration * deltaSeconds, 0, params.maxSpeed);
  const speedRatio = speedForward / params.maxSpeed;
  const curveDelta = roadSample.segment.curveDelta;
  const curveOutwardAccel = -curveDelta * speedForward * speedForward * params.centrifugalAccel;
  const steerLateralAccel = steerInput * params.steerLateralAccel * (0.28 + speedRatio * 0.92);
  const lateralDrag =
    params.lateralDrag +
    (Math.abs(rawSteer) < 0.05 ? params.lateralNeutralDrag : 0) +
    (Math.abs(curveDelta) < params.straightCurveEpsilon ? params.lateralStraightDrag : 0) +
    (brakeInput > 0 ? params.brakeLateralDrag : 0);
  const lateralVelocity =
    player.lateralVelocity +
    (steerLateralAccel + curveOutwardAccel - player.lateralVelocity * lateralDrag) * deltaSeconds;
  const laneOffset = clamp(player.laneOffset + lateralVelocity * deltaSeconds, -params.laneClamp, params.laneClamp);
  const headingTarget = clamp(
    steerInput * params.headingFromSteer * (0.45 + speedRatio * 0.75) +
      clamp((lateralVelocity / params.maxSpeed) * params.headingFromLateral, -0.18, 0.18) +
      clamp(-curveDelta * speedForward * params.headingFromCurve, -0.14, 0.14),
    -params.maxHeadingError,
    params.maxHeadingError
  );
  const headingResponse =
    params.headingVisualResponse +
    (comparisons.headingRecovery && Math.abs(rawSteer) < 0.05 ? params.steerReturnRate : 0);
  const headingError = clamp(
    blendToward(player.headingError, headingTarget, headingResponse, deltaSeconds),
    -params.maxHeadingError,
    params.maxHeadingError
  );
  const slipTarget = clamp(
    (lateralVelocity / params.maxSpeed) * params.slipFromLateral +
      clamp(curveOutwardAccel / params.steerLateralAccel, -1, 1) * params.slipFromCurve,
    -params.maxSlipAngle,
    params.maxSlipAngle
  );
  const slipResponse = comparisons.slipRecovery
    ? params.slipResponse +
      (Math.abs(rawSteer) < 0.05 ? params.slipNeutralRecovery : 0) +
      (Math.abs(curveDelta) < params.straightCurveEpsilon ? params.slipStraightRecovery : 0)
    : params.slipResponse;
  const slipAngle = clamp(
    blendToward(player.slipAngle, slipTarget, slipResponse, deltaSeconds),
    -params.maxSlipAngle,
    params.maxSlipAngle
  );
  const velocityDirectionRelative = clamp(headingError + slipAngle, -params.maxHeadingError - params.maxSlipAngle, params.maxHeadingError + params.maxSlipAngle);
  const offroad = Math.abs(laneOffset) > params.drivableHalfWidth;
  const carHeading = roadSample.tangentHeading + headingError;
  const velocityDirection = roadSample.tangentHeading + velocityDirectionRelative;
  const nextPlayer: PlayerState = {
    distanceZ: player.distanceZ + speedForward * deltaSeconds,
    laneOffset,
    speedForward,
    headingError,
    slipAngle,
    lateralVelocity,
    steerInput,
    throttleInput,
    brakeInput,
    offroad
  };

  return {
    player: nextPlayer,
    telemetry: {
      velocityDirection,
      carHeading
    }
  };
};
