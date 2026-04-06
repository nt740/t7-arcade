import { sampleTrack } from "../track/trackSampler";
import type { PlayerTelemetry } from "../player/playerTypes";
import { stepPlayer } from "../player/playerStep";
import type { CameraTelemetry } from "../camera/cameraTypes";
import { stepCamera } from "../camera/cameraStep";
import type { SimulationState } from "./simulationState";

export interface SimulationTelemetry {
  player: PlayerTelemetry;
  camera: CameraTelemetry;
}

export const stepSimulation = (
  state: SimulationState,
  deltaSeconds: number
): SimulationTelemetry => {
  const roadSample = sampleTrack(state.trackLayout, state.player.distanceZ);
  const playerStepResult = stepPlayer(
    state.player,
    state.input,
    state.comparisonSwitches,
    roadSample,
    deltaSeconds,
    state.params.player
  );
  state.player = playerStepResult.player;

  const updatedRoadSample = sampleTrack(state.trackLayout, state.player.distanceZ);
  const cameraStep = stepCamera(
    state.camera,
    state.player,
    updatedRoadSample,
    state.trackLayout,
    deltaSeconds,
    state.params.camera,
    state.comparisonSwitches.cameraLookAhead,
    state.comparisonSwitches.cameraYawSmoothing
  );
  state.camera = cameraStep.camera;
  state.runtime.elapsedMs += deltaSeconds * 1000;
  state.runtime.frameId += 1;

  return {
    player: {
      carHeading: cameraStep.telemetry.roadTangentAhead + state.player.headingError,
      velocityDirection: cameraStep.telemetry.roadTangentAhead + state.player.headingError + state.player.slipAngle
    },
    camera: cameraStep.telemetry
  };
};
