import type { Vec2, Vec3 } from "../types/common";

export interface ProjectionParams {
  nearPlane: number;
  fieldOfView: number;
  drawDistance: number;
  sampleStep: number;
  roadHalfWidth: number;
  rumbleWidth: number;
  laneStripeWidth: number;
  laneStripeLength: number;
  laneStripeGap: number;
}

export interface ProjectedPoint {
  world: Vec3;
  screen: Vec2;
  scale: number;
  clipped: boolean;
}

export interface VisibleRoadSample {
  depth: number;
  center: Vec2;
}
