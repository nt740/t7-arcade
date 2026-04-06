import { sampleTrack } from "../core/track/trackSampler";
import type { DebugSnapshot } from "../core/types/debug";
import type { FramePacket } from "../core/types/framePacket";
import type { SimulationState } from "../core/simulation/simulationState";
import type { SimulationTelemetry } from "../core/simulation/simulationStep";
import type { DebugUiState } from "./debugStateStore";

const formatDegrees = (value: number): string => `${((value * 180) / Math.PI).toFixed(2)} deg`;

export const buildDebugSnapshot = (
  simulationState: SimulationState,
  telemetry: SimulationTelemetry,
  framePacket: FramePacket,
  debugUiState: DebugUiState,
  buildId: string
): DebugSnapshot => {
  const roadSample = sampleTrack(simulationState.trackLayout, simulationState.player.distanceZ);

  return {
    buildId,
    frameId: simulationState.runtime.frameId,
    mode: debugUiState.mode,
    sectionName: roadSample.sectionName,
    sectionProgress: roadSample.sectionProgress,
    speed: simulationState.player.speedForward,
    laneOffset: simulationState.player.laneOffset,
    lateralVelocity: simulationState.player.lateralVelocity,
    headingError: simulationState.player.headingError,
    slipAngle: simulationState.player.slipAngle,
    roadTangent: telemetry.camera.roadTangentAhead,
    carHeading: telemetry.player.carHeading,
    cameraHeading: simulationState.camera.viewHeading,
    velocityDirection: telemetry.player.velocityDirection,
    nearFieldMode: framePacket.debug.nearFieldMode,
    overlayToggles: debugUiState.overlays,
    comparisonSwitches: debugUiState.comparisons,
    summaryLines: [
      `build      ${buildId}`,
      `section    ${roadSample.sectionName}`,
      `playback   ${simulationState.runtime.playbackMode}`,
      `dbg mode   ${debugUiState.mode}`,
      `curve str  ${simulationState.runtime.curveStrength.toFixed(1)}x`,
      `speed      ${simulationState.player.speedForward.toFixed(2)} seg/s`,
      `lane x     ${simulationState.player.laneOffset.toFixed(3)}`,
      `lat vel    ${simulationState.player.lateralVelocity.toFixed(3)}`,
      `heading    ${formatDegrees(simulationState.player.headingError)}`,
      `slip       ${formatDegrees(simulationState.player.slipAngle)}`,
      `road tan   ${formatDegrees(telemetry.camera.roadTangentAhead)}`,
      `car head   ${formatDegrees(telemetry.player.carHeading)}`,
      `cam head   ${formatDegrees(simulationState.camera.viewHeading)}`,
      `vel dir    ${formatDegrees(telemetry.player.velocityDirection)}`,
      `progress   ${(roadSample.sectionProgress * 100).toFixed(1)}%`,
      `near field ${framePacket.debug.nearFieldMode}`
    ]
  };
};
