import type { PlayerPose } from "../../core/types/framePacket";

const drawPolygon = (context: CanvasRenderingContext2D, points: readonly [number, number][]): void => {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index][0], points[index][1]);
  }
  context.closePath();
};

export const drawPlayer = (context: CanvasRenderingContext2D, pose: PlayerPose): void => {
  const yawShift = pose.bodyYaw * 38;
  const slipShift = pose.slipYaw * 14;
  const leanRotation = pose.steerLean * 0.025;
  const roofShift = yawShift * 1.1;
  const cabinShift = yawShift * 0.8;
  const bodyLeft = -42;
  const bodyRight = 42;
  const rearY = 46;
  const shoulderY = -12;
  const roofY = -72;
  const wheelY = 20;
  const sideReveal = Math.max(-1, Math.min(1, pose.bodyYaw / 0.58));

  context.save();
  context.translate(pose.screenX, pose.screenY);
  context.rotate(leanRotation);

  context.fillStyle = "rgba(10, 14, 22, 0.24)";
  drawPolygon(context, [
    [bodyLeft - 8 + slipShift, rearY + 10],
    [bodyRight + 8 + slipShift, rearY + 10],
    [28 + roofShift + slipShift * 1.3, roofY + 12],
    [-28 + roofShift + slipShift * 1.3, roofY + 12]
  ]);
  context.fill();

  context.fillStyle = "#e7edf9";
  drawPolygon(context, [
    [bodyLeft, rearY],
    [bodyRight, rearY],
    [36 + cabinShift, shoulderY],
    [22 + roofShift, roofY],
    [-22 + roofShift, roofY],
    [-36 + cabinShift, shoulderY]
  ]);
  context.fill();

  context.fillStyle = sideReveal >= 0 ? "rgba(255, 255, 255, 0.14)" : "rgba(52, 62, 78, 0.2)";
  drawPolygon(context, [
    [bodyLeft, rearY],
    [-36 + cabinShift, shoulderY],
    [-22 + roofShift, roofY],
    [-12 + roofShift, roofY],
    [-8 + cabinShift, shoulderY],
    [-6, rearY]
  ]);
  context.fill();

  context.fillStyle = sideReveal >= 0 ? "rgba(46, 54, 68, 0.22)" : "rgba(255, 255, 255, 0.12)";
  drawPolygon(context, [
    [6, rearY],
    [8 + cabinShift, shoulderY],
    [12 + roofShift, roofY],
    [22 + roofShift, roofY],
    [36 + cabinShift, shoulderY],
    [bodyRight, rearY]
  ]);
  context.fill();

  context.fillStyle = "#8db6e6";
  drawPolygon(context, [
    [-18 + roofShift * 0.95, -40],
    [18 + roofShift * 0.95, -40],
    [12 + cabinShift * 0.75, -4],
    [-12 + cabinShift * 0.75, -4]
  ]);
  context.fill();

  context.fillStyle = "#6f757e";
  drawPolygon(context, [
    [-28, wheelY],
    [28, wheelY],
    [28, rearY - 4],
    [-28, rearY - 4]
  ]);
  context.fill();

  context.fillStyle = "#1c2230";
  drawPolygon(context, [
    [-22 + cabinShift * 0.15, 10],
    [22 + cabinShift * 0.15, 10],
    [20, 14],
    [-20, 14]
  ]);
  context.fill();

  context.fillStyle = "#f04953";
  context.fillRect(-26 + sideReveal * 3, rearY - 12, 11, 18);
  context.fillRect(15 + sideReveal * 3, rearY - 12, 11, 18);

  context.fillStyle = "#f3e7a1";
  context.fillRect(-22 + roofShift * 0.3, roofY + 8, 14, 8);
  context.fillRect(8 + roofShift * 0.3, roofY + 8, 14, 8);
  context.restore();
};
