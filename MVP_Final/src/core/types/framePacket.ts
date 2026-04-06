import type { Vec2 } from "./common";

export interface CameraFrame {
  worldX: number;
  worldY: number;
  worldZ: number;
  viewHeading: number;
  horizonY: number;
}

export interface RoadBand {
  depth: number;
  screenQuad: [Vec2, Vec2, Vec2, Vec2];
  roadStyleId: string;
}

export interface LaneBand {
  depth: number;
  screenQuad: [Vec2, Vec2, Vec2, Vec2];
  styleId: string;
}

export interface RoadsideGuideInstance {
  depth: number;
  x: number;
  y: number;
  scale: number;
  spriteId: string;
  anchor: "roadside-left" | "roadside-right" | "world";
}

export interface PlayerPose {
  screenX: number;
  screenY: number;
  steerLean: number;
  bodyYaw: number;
  slipYaw: number;
  roadHeading: number;
  laneRatio: number;
  speedReadout: number;
}

export interface BackgroundLayerState {
  colorTop: string;
  colorBottom: string;
  horizonY: number;
}

export interface DebugFrame {
  nearFieldMode: "unknown" | "real" | "synthetic";
  orientationOrigin: Vec2;
  centerline: Vec2[];
  leftEdge: Vec2[];
  rightEdge: Vec2[];
  sampleDots: Vec2[];
  seamY: number | null;
}

export interface FramePacket {
  camera: CameraFrame;
  roadBands: RoadBand[];
  laneBands: LaneBand[];
  roadsideInstances: RoadsideGuideInstance[];
  playerPose: PlayerPose;
  backgroundLayers: BackgroundLayerState[];
  debug: DebugFrame;
}
