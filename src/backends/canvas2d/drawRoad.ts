import type { LaneBand, RoadBand } from "../../core/types/framePacket";

export const drawRoad = (
  context: CanvasRenderingContext2D,
  roadBands: RoadBand[],
  laneBands: LaneBand[],
  width: number,
  height: number
): void => {
  if (roadBands.length === 0) {
    context.fillStyle = "rgba(22, 34, 58, 0.9)";
    context.beginPath();
    context.moveTo(width * 0.3, height);
    context.lineTo(width * 0.45, height * 0.62);
    context.lineTo(width * 0.55, height * 0.62);
    context.lineTo(width * 0.7, height);
    context.closePath();
    context.fill();

    context.strokeStyle = "rgba(255, 255, 255, 0.3)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(width * 0.5, height * 0.62);
    context.lineTo(width * 0.5, height * 0.93);
    context.stroke();
    return;
  }

  for (const band of roadBands) {
    context.fillStyle = band.roadStyleId;
    context.beginPath();
    context.moveTo(band.screenQuad[0].x, band.screenQuad[0].y);
    context.lineTo(band.screenQuad[1].x, band.screenQuad[1].y);
    context.lineTo(band.screenQuad[2].x, band.screenQuad[2].y);
    context.lineTo(band.screenQuad[3].x, band.screenQuad[3].y);
    context.closePath();
    context.fill();
  }

  for (const band of laneBands) {
    context.fillStyle = band.styleId;
    context.beginPath();
    context.moveTo(band.screenQuad[0].x, band.screenQuad[0].y);
    context.lineTo(band.screenQuad[1].x, band.screenQuad[1].y);
    context.lineTo(band.screenQuad[2].x, band.screenQuad[2].y);
    context.lineTo(band.screenQuad[3].x, band.screenQuad[3].y);
    context.closePath();
    context.fill();
  }
};
