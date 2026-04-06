import type { SectionId } from "./common";

export interface InputSample {
  steer: number;
  throttle: number;
  brake: number;
  timestampMs: number;
}

export interface SectionJumpRequest {
  sectionId: SectionId;
  requestedAtMs: number;
}

export type PlaybackMode = "play" | "pause" | "slow-50" | "slow-25";

export interface InputState {
  steerAxis: number;
  throttlePressed: boolean;
  brakePressed: boolean;
  resetRequested: boolean;
  frameStepRequested: boolean;
  pauseToggleRequested: boolean;
  sectionJumpRequest: SectionJumpRequest | null;
}

export const createInputState = (): InputState => ({
  steerAxis: 0,
  throttlePressed: false,
  brakePressed: false,
  resetRequested: false,
  frameStepRequested: false,
  pauseToggleRequested: false,
  sectionJumpRequest: null
});
