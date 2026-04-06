export interface PlayerState {
  distanceZ: number;
  laneOffset: number;
  speedForward: number;
  headingError: number;
  slipAngle: number;
  lateralVelocity: number;
  steerInput: number;
  throttleInput: number;
  brakeInput: number;
  offroad: boolean;
}

export interface PlayerParams {
  maxSpeed: number;
  acceleration: number;
  brakeForce: number;
  drag: number;
  offroadDrag: number;
  steerResponse: number;
  steerReturnRate: number;
  steerLateralAccel: number;
  centrifugalAccel: number;
  lateralDrag: number;
  lateralNeutralDrag: number;
  lateralStraightDrag: number;
  brakeLateralDrag: number;
  headingVisualResponse: number;
  headingFromSteer: number;
  headingFromLateral: number;
  headingFromCurve: number;
  slipResponse: number;
  slipFromLateral: number;
  slipFromCurve: number;
  slipNeutralRecovery: number;
  slipStraightRecovery: number;
  drivableHalfWidth: number;
  laneClamp: number;
  maxHeadingError: number;
  maxSlipAngle: number;
  straightCurveEpsilon: number;
}

export interface PlayerTelemetry {
  velocityDirection: number;
  carHeading: number;
}

export const createInitialPlayerState = (): PlayerState => ({
  distanceZ: 0,
  laneOffset: 0,
  speedForward: 0,
  headingError: 0,
  slipAngle: 0,
  lateralVelocity: 0,
  steerInput: 0,
  throttleInput: 0,
  brakeInput: 0,
  offroad: false
});
