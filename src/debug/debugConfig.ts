import type { ComparisonSwitches, DebugMode, OverlayToggles } from "../core/types/debug";

export const DEFAULT_DEBUG_MODE: DebugMode = "diagnostic";

export const createDefaultOverlayToggles = (): OverlayToggles => ({
  orientationGizmos: true,
  roadGeometry: true,
  traceGraphs: true,
  seamMarkers: true,
  horizonLine: true,
  sampleDots: false
});

export const createDefaultComparisonSwitches = (): ComparisonSwitches => ({
  cameraLookAhead: true,
  cameraYawSmoothing: true,
  nearFieldExtension: false,
  slipRecovery: true,
  headingRecovery: true,
  laneCenteringAids: false
});
