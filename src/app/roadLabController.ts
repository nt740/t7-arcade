import { Canvas2DRenderer } from "../backends/canvas2d/canvas2dRenderer";
import { buildFramePacket } from "../core/projection/buildFramePacket";
import { FixedStepRunner } from "../core/simulation/fixedStep";
import { createSimulationState, type SimulationState } from "../core/simulation/simulationState";
import { stepSimulation, type SimulationTelemetry } from "../core/simulation/simulationStep";
import { buildTrackLayout } from "../core/track/trackBuilder";
import { createRoadLabSections } from "../core/track/trackAuthoring";
import { findTrackSection } from "../core/track/trackSampler";
import { DebugHistoryBuffer } from "../debug/debugHistoryBuffer";
import { buildDebugSnapshot } from "../debug/debugSnapshotBuilder";
import type { DebugInputModel } from "../debug/debugInputModel";
import type { DebugStateStore } from "../debug/debugStateStore";
import type { ComparisonSwitches, DebugMode, OverlayToggles } from "../core/types/debug";
import type { PlaybackMode } from "../core/types/input";
import type { RuntimeConfig } from "./runtimeConfig";
import type { HudMount } from "../ui/hudMount";
import type { ControlsMount } from "../ui/controlsMount";

const EMPTY_TELEMETRY: SimulationTelemetry = {
  player: {
    velocityDirection: 0,
    carHeading: 0
  },
  camera: {
    roadTangentAhead: 0
  }
};

export interface RoadLabControllerDeps {
  renderer: Canvas2DRenderer;
  hud: HudMount;
  controls: ControlsMount;
  inputModel: DebugInputModel;
  debugState: DebugStateStore;
  history: DebugHistoryBuffer;
  config: RuntimeConfig;
}

export class RoadLabController {
  private readonly renderer: Canvas2DRenderer;
  private readonly hud: HudMount;
  private readonly controls: ControlsMount;
  private readonly inputModel: DebugInputModel;
  private readonly debugState: DebugStateStore;
  private readonly history: DebugHistoryBuffer;
  private readonly config: RuntimeConfig;
  private readonly fixedStep: FixedStepRunner;
  private simulationState: SimulationState;
  private lastTelemetry: SimulationTelemetry = EMPTY_TELEMETRY;
  private animationFrameId = 0;
  private pendingCurveStrength: number | null = null;
  private pendingFrameStep = false;

  constructor(deps: RoadLabControllerDeps) {
    this.renderer = deps.renderer;
    this.hud = deps.hud;
    this.controls = deps.controls;
    this.inputModel = deps.inputModel;
    this.debugState = deps.debugState;
    this.history = deps.history;
    this.config = deps.config;
    this.fixedStep = new FixedStepRunner(deps.config.fixedStep);
    this.simulationState = createSimulationState(
      buildTrackLayout(createRoadLabSections(deps.config.curveStrength.defaultValue), deps.config.segmentLength),
      deps.config.curveStrength.defaultValue,
      {
        player: deps.config.player,
        camera: deps.config.camera
      },
      deps.debugState.getState().comparisons
    );
  }

  public start(): void {
    this.resize();
    this.applyPlaybackMode(this.simulationState.runtime.playbackMode);
    this.syncControls();
    this.animationFrameId = window.requestAnimationFrame(this.onAnimationFrame);
  }

  public destroy(): void {
    if (this.animationFrameId !== 0) {
      window.cancelAnimationFrame(this.animationFrameId);
    }
  }

  public resize(): void {
    this.renderer.resize(window.innerWidth, window.innerHeight);
  }

  public setCurveStrength(value: number): void {
    this.pendingCurveStrength = value;
  }

  public setPlaybackMode(mode: PlaybackMode): void {
    this.simulationState.runtime.playbackMode = mode;
    this.applyPlaybackMode(mode);
    this.syncControls();
  }

  public requestFrameStep(): void {
    this.pendingFrameStep = true;
  }

  public setDebugMode(mode: DebugMode): void {
    this.debugState.setMode(mode);
    this.syncControls();
  }

  public setOverlayToggle(key: keyof OverlayToggles, value: boolean): void {
    this.debugState.setOverlayToggle(key, value);
    this.syncControls();
  }

  public setComparisonToggle(key: keyof ComparisonSwitches, value: boolean): void {
    this.debugState.setComparisonToggle(key, value);
    this.simulationState.comparisonSwitches = this.debugState.getState().comparisons;
    this.syncControls();
  }

  private readonly onAnimationFrame = (timestampMs: number): void => {
    this.applyRuntimeUpdates();
    this.simulationState.input = this.inputModel.getState();
    this.simulationState.comparisonSwitches = this.debugState.getState().comparisons;
    this.handleTransientActions();

    if (this.pendingFrameStep || this.simulationState.input.frameStepRequested) {
      this.advanceSimulation(this.config.fixedStep.fixedDeltaSeconds);
      this.pendingFrameStep = false;
    }

    this.fixedStep.step(timestampMs, (deltaSeconds) => {
      this.advanceSimulation(deltaSeconds);
    });
    this.inputModel.consumeTransientFlags();

    const framePacket = buildFramePacket(
      this.simulationState.trackLayout,
      this.simulationState.player,
      this.simulationState.camera,
      window.innerWidth,
      window.innerHeight,
      this.config.projection
    );
    const snapshot = buildDebugSnapshot(
      this.simulationState,
      this.lastTelemetry,
      framePacket,
      this.debugState.getState(),
      this.config.buildId
    );

    this.hud.render(snapshot);
    this.renderer.render(framePacket, snapshot, this.history.getSamples());
    this.animationFrameId = window.requestAnimationFrame(this.onAnimationFrame);
  };

  private advanceSimulation(deltaSeconds: number): void {
    this.lastTelemetry = stepSimulation(this.simulationState, deltaSeconds);
    this.history.push({
      timestampMs: this.simulationState.runtime.elapsedMs,
      laneOffset: this.simulationState.player.laneOffset,
      lateralVelocity: this.simulationState.player.lateralVelocity,
      headingError: this.simulationState.player.headingError,
      slipAngle: this.simulationState.player.slipAngle,
      roadTangent: this.lastTelemetry.camera.roadTangentAhead,
      carHeading: this.lastTelemetry.player.carHeading,
      cameraHeading: this.simulationState.camera.viewHeading,
      velocityDirection: this.lastTelemetry.player.velocityDirection
    });
  }

  private applyRuntimeUpdates(): void {
    if (this.pendingCurveStrength === null) {
      return;
    }

    this.simulationState.runtime.curveStrength = this.pendingCurveStrength;
    this.simulationState.trackLayout = buildTrackLayout(
      createRoadLabSections(this.pendingCurveStrength),
      this.config.segmentLength
    );
    this.pendingCurveStrength = null;
  }

  private handleTransientActions(): void {
    const { input } = this.simulationState;
    if (input.pauseToggleRequested) {
      this.setPlaybackMode(this.simulationState.runtime.playbackMode === "pause" ? "play" : "pause");
    }

    if (input.resetRequested) {
      this.resetPlayerToDistance(0);
    }

    if (!input.sectionJumpRequest) {
      return;
    }

    const sectionLookup: Record<string, string> = {
      "1": "launch-straight",
      "2": "grand-right-arc",
      "3": "compression-right",
      "4": "grand-left-arc",
      "5": "tight-left-bend"
    };
    const sectionId = sectionLookup[input.sectionJumpRequest.sectionId];
    const targetSection = sectionId ? findTrackSection(this.simulationState.trackLayout, sectionId) : undefined;

    if (!targetSection) {
      return;
    }

    this.resetPlayerToDistance(targetSection.zStart);
  }

  private resetPlayerToDistance(distanceZ: number): void {
    this.simulationState.player.distanceZ = distanceZ;
    this.simulationState.player.laneOffset = 0;
    this.simulationState.player.speedForward = 0;
    this.simulationState.player.headingError = 0;
    this.simulationState.player.slipAngle = 0;
    this.simulationState.player.lateralVelocity = 0;
    this.simulationState.player.steerInput = 0;
    this.simulationState.player.throttleInput = 0;
    this.simulationState.player.brakeInput = 0;
    this.simulationState.player.offroad = false;
  }

  private applyPlaybackMode(mode: PlaybackMode): void {
    switch (mode) {
      case "pause":
        this.fixedStep.setPaused(true);
        this.fixedStep.setTimeScale(1);
        break;
      case "slow-25":
        this.fixedStep.setPaused(false);
        this.fixedStep.setTimeScale(0.25);
        break;
      case "slow-50":
        this.fixedStep.setPaused(false);
        this.fixedStep.setTimeScale(0.5);
        break;
      case "play":
      default:
        this.fixedStep.setPaused(false);
        this.fixedStep.setTimeScale(1);
        break;
    }
  }

  private syncControls(): void {
    this.controls.sync({
      curveStrength: this.simulationState.runtime.curveStrength,
      playbackMode: this.simulationState.runtime.playbackMode,
      debugMode: this.debugState.getState().mode,
      overlays: this.debugState.getState().overlays,
      comparisons: this.debugState.getState().comparisons
    });
  }
}
