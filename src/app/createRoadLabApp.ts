import { Canvas2DRenderer } from "../backends/canvas2d/canvas2dRenderer";
import { createDefaultComparisonSwitches, createDefaultOverlayToggles, DEFAULT_DEBUG_MODE } from "../debug/debugConfig";
import { DebugHistoryBuffer } from "../debug/debugHistoryBuffer";
import { DebugInputModel, type TouchBindings } from "../debug/debugInputModel";
import { DebugStateStore } from "../debug/debugStateStore";
import { mountControls, type ControlsDom } from "../ui/controlsMount";
import { mountHud } from "../ui/hudMount";
import { RoadLabController } from "./roadLabController";
import { runtimeConfig } from "./runtimeConfig";

export interface RoadLabDom {
  canvas: HTMLCanvasElement;
  debugReadout: HTMLElement;
  controls: ControlsDom;
  touchBindings: TouchBindings;
}

export interface RoadLabApp {
  start(): void;
  destroy(): void;
}

export const createRoadLabApp = (dom: RoadLabDom): RoadLabApp => {
  const renderer = new Canvas2DRenderer(dom.canvas);
  const hud = mountHud(dom.debugReadout);
  const debugState = new DebugStateStore({
    mode: DEFAULT_DEBUG_MODE,
    overlays: createDefaultOverlayToggles(),
    comparisons: createDefaultComparisonSwitches()
  });
  const history = new DebugHistoryBuffer(3000);
  const inputModel = new DebugInputModel(dom.touchBindings);
  let controller: RoadLabController | null = null;
  const controls = mountControls({
    dom: dom.controls,
    onCurveStrengthChange: (value) => controller?.setCurveStrength(value),
    onPlaybackModeChange: (mode) => controller?.setPlaybackMode(mode),
    onFrameStep: () => controller?.requestFrameStep(),
    onDebugModeChange: (mode) => controller?.setDebugMode(mode),
    onOverlayToggle: (key, value) => controller?.setOverlayToggle(key, value),
    onComparisonToggle: (key, value) => controller?.setComparisonToggle(key, value)
  });
  controller = new RoadLabController({
    renderer,
    hud,
    controls,
    inputModel,
    debugState,
    history,
    config: runtimeConfig
  });

  const onResize = (): void => controller?.resize();

  return {
    start(): void {
      window.addEventListener("resize", onResize);
      controller?.start();
    },
    destroy(): void {
      window.removeEventListener("resize", onResize);
      controls.destroy();
      inputModel.destroy();
      controller?.destroy();
    }
  };
};
