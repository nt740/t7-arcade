export type DebugMode = "minimal" | "diagnostic" | "analysis";

export interface OverlayToggles {
  orientationGizmos: boolean;
  roadGeometry: boolean;
  traceGraphs: boolean;
  seamMarkers: boolean;
  horizonLine: boolean;
  sampleDots: boolean;
}

export interface ComparisonSwitches {
  cameraLookAhead: boolean;
  cameraYawSmoothing: boolean;
  nearFieldExtension: boolean;
  slipRecovery: boolean;
  headingRecovery: boolean;
  laneCenteringAids: boolean;
}

export type GraphChannel =
  | "laneOffset"
  | "lateralVelocity"
  | "headingError"
  | "slipAngle"
  | "roadTangent"
  | "carHeading"
  | "cameraHeading"
  | "velocityDirection";

export interface DebugSnapshot {
  buildId: string;
  frameId: number;
  mode: DebugMode;
  sectionName: string;
  sectionProgress: number;
  speed: number;
  laneOffset: number;
  lateralVelocity: number;
  headingError: number;
  slipAngle: number;
  roadTangent: number;
  carHeading: number;
  cameraHeading: number;
  velocityDirection: number;
  nearFieldMode: "unknown" | "real" | "synthetic";
  overlayToggles: OverlayToggles;
  comparisonSwitches: ComparisonSwitches;
  summaryLines: string[];
}
