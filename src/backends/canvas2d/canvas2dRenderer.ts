import type { DebugSnapshot } from "../../core/types/debug";
import type { FramePacket } from "../../core/types/framePacket";
import type { DebugHistorySample } from "../../debug/debugHistoryBuffer";
import { drawBackground } from "./drawBackground";
import { drawRoad } from "./drawRoad";
import { drawPlayer } from "./drawPlayer";
import { drawDebugOverlay } from "./drawDebugOverlay";
import { drawTracePanel } from "./drawTracePanel";
import { drawControlPanel } from "./drawControlPanel";

export class Canvas2DRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private viewportWidth = 0;
  private viewportHeight = 0;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas2D unavailable");
    }

    this.canvas = canvas;
    this.context = context;
  }

  public resize(width: number, height: number): void {
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.canvas.width = Math.round(width * pixelRatio);
    this.canvas.height = Math.round(height * pixelRatio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  public render(framePacket: FramePacket, debugSnapshot: DebugSnapshot, historySamples: DebugHistorySample[]): void {
    this.context.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
    drawBackground(this.context, this.viewportWidth, this.viewportHeight, framePacket.backgroundLayers, framePacket.camera);
    drawRoad(this.context, framePacket.roadBands, framePacket.laneBands, this.viewportWidth, this.viewportHeight);
    drawPlayer(this.context, framePacket.playerPose);
    drawDebugOverlay(this.context, framePacket, debugSnapshot);
    drawTracePanel(this.context, historySamples, debugSnapshot);
    drawControlPanel(this.context, debugSnapshot);
  }
}
