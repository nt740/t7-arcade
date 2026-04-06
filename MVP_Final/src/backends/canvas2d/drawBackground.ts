import type { BackgroundLayerState, CameraFrame } from "../../core/types/framePacket";

export const drawBackground = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundLayers: BackgroundLayerState[],
  camera: CameraFrame
): void => {
  const background = backgroundLayers[0] ?? {
    colorTop: "#10204a",
    colorBottom: "#f0ab6f",
    horizonY: height * 0.38
  };
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, background.colorTop);
  gradient.addColorStop(1, background.colorBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(8, 20, 14, 0.82)";
  context.fillRect(0, background.horizonY, width, height - background.horizonY);

  context.strokeStyle = "rgba(255, 255, 255, 0.18)";
  context.beginPath();
  context.moveTo(0, camera.horizonY);
  context.lineTo(width, camera.horizonY);
  context.stroke();
};
