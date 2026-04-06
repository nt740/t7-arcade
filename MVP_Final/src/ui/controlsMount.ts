import type { ComparisonSwitches, DebugMode, OverlayToggles } from "../core/types/debug";
import type { PlaybackMode } from "../core/types/input";

export interface ControlsDom {
  curveStrength: HTMLInputElement;
  curveStrengthValue: HTMLElement;
  playbackMode: HTMLSelectElement;
  playbackStep: HTMLButtonElement;
  debugMode: HTMLSelectElement;
  overlayInputs: Record<keyof OverlayToggles, HTMLInputElement>;
  comparisonInputs: Record<keyof ComparisonSwitches, HTMLInputElement>;
}

export interface ControlsMountOptions {
  dom: ControlsDom;
  onCurveStrengthChange: (value: number) => void;
  onPlaybackModeChange: (mode: PlaybackMode) => void;
  onFrameStep: () => void;
  onDebugModeChange: (mode: DebugMode) => void;
  onOverlayToggle: (key: keyof OverlayToggles, value: boolean) => void;
  onComparisonToggle: (key: keyof ComparisonSwitches, value: boolean) => void;
}

export interface ControlsSyncState {
  curveStrength: number;
  playbackMode: PlaybackMode;
  debugMode: DebugMode;
  overlays: OverlayToggles;
  comparisons: ComparisonSwitches;
}

export interface ControlsMount {
  sync(state: ControlsSyncState): void;
  destroy(): void;
}

const overlayKeys: Array<keyof OverlayToggles> = [
  "orientationGizmos",
  "roadGeometry",
  "traceGraphs",
  "seamMarkers",
  "horizonLine",
  "sampleDots"
];

const comparisonKeys: Array<keyof ComparisonSwitches> = [
  "cameraLookAhead",
  "cameraYawSmoothing",
  "nearFieldExtension",
  "slipRecovery",
  "headingRecovery",
  "laneCenteringAids"
];

export const mountControls = (options: ControlsMountOptions): ControlsMount => {
  const disposers: Array<() => void> = [];
  const { dom } = options;

  const updateCurveStrength = (value: number): void => {
    dom.curveStrength.value = value.toFixed(1);
    dom.curveStrengthValue.textContent = `${value.toFixed(1)}x`;
  };

  const onCurveInput = (): void => {
    const value = Number(dom.curveStrength.value);
    updateCurveStrength(value);
    options.onCurveStrengthChange(value);
  };
  dom.curveStrength.addEventListener("input", onCurveInput);
  disposers.push(() => dom.curveStrength.removeEventListener("input", onCurveInput));

  const onPlaybackChange = (): void => {
    options.onPlaybackModeChange(dom.playbackMode.value as PlaybackMode);
  };
  dom.playbackMode.addEventListener("change", onPlaybackChange);
  disposers.push(() => dom.playbackMode.removeEventListener("change", onPlaybackChange));

  const onFrameStep = (): void => {
    options.onFrameStep();
  };
  dom.playbackStep.addEventListener("click", onFrameStep);
  disposers.push(() => dom.playbackStep.removeEventListener("click", onFrameStep));

  const onDebugModeChange = (): void => {
    options.onDebugModeChange(dom.debugMode.value as DebugMode);
  };
  dom.debugMode.addEventListener("change", onDebugModeChange);
  disposers.push(() => dom.debugMode.removeEventListener("change", onDebugModeChange));

  for (const key of overlayKeys) {
    const input = dom.overlayInputs[key];
    const handler = (): void => options.onOverlayToggle(key, input.checked);
    input.addEventListener("change", handler);
    disposers.push(() => input.removeEventListener("change", handler));
  }

  for (const key of comparisonKeys) {
    const input = dom.comparisonInputs[key];
    const handler = (): void => options.onComparisonToggle(key, input.checked);
    input.addEventListener("change", handler);
    disposers.push(() => input.removeEventListener("change", handler));
  }

  return {
    sync(state: ControlsSyncState): void {
      updateCurveStrength(state.curveStrength);
      dom.playbackMode.value = state.playbackMode;
      dom.debugMode.value = state.debugMode;
      for (const key of overlayKeys) {
        dom.overlayInputs[key].checked = state.overlays[key];
      }
      for (const key of comparisonKeys) {
        dom.comparisonInputs[key].checked = state.comparisons[key];
      }
    },
    destroy(): void {
      for (const dispose of disposers) {
        dispose();
      }
    }
  };
};
