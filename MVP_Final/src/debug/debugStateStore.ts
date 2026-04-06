import type { ComparisonSwitches, DebugMode, OverlayToggles } from "../core/types/debug";

export interface DebugUiState {
  mode: DebugMode;
  overlays: OverlayToggles;
  comparisons: ComparisonSwitches;
}

export class DebugStateStore {
  private state: DebugUiState;

  constructor(initialState: DebugUiState) {
    this.state = initialState;
  }

  public getState(): DebugUiState {
    return this.state;
  }

  public setMode(mode: DebugMode): void {
    this.state = {
      ...this.state,
      mode
    };
  }

  public setOverlays(overlays: OverlayToggles): void {
    this.state = {
      ...this.state,
      overlays
    };
  }

  public setOverlayToggle(key: keyof OverlayToggles, value: boolean): void {
    this.state = {
      ...this.state,
      overlays: {
        ...this.state.overlays,
        [key]: value
      }
    };
  }

  public setComparisons(comparisons: ComparisonSwitches): void {
    this.state = {
      ...this.state,
      comparisons
    };
  }

  public setComparisonToggle(key: keyof ComparisonSwitches, value: boolean): void {
    this.state = {
      ...this.state,
      comparisons: {
        ...this.state.comparisons,
        [key]: value
      }
    };
  }
}
