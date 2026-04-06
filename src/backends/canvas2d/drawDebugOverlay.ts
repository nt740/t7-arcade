import type { DebugSnapshot } from "../../core/types/debug";
import type { FramePacket } from "../../core/types/framePacket";

const drawPolyline = (context: CanvasRenderingContext2D, points: readonly { x: number; y: number }[]): void => {
  if (points.length < 2) {
    return;
  }

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.stroke();
};

const drawVector = (
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  angle: number,
  length: number,
  color: string
): void => {
  const endX = originX + Math.sin(angle) * length;
  const endY = originY - Math.cos(angle) * length;

  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(originX, originY);
  context.lineTo(endX, endY);
  context.stroke();

  const headLength = 7;
  const headAngle = Math.atan2(originY - endY, endX - originX);
  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(
    endX - Math.cos(headAngle - Math.PI / 6) * headLength,
    endY - Math.sin(headAngle - Math.PI / 6) * headLength
  );
  context.lineTo(
    endX - Math.cos(headAngle + Math.PI / 6) * headLength,
    endY - Math.sin(headAngle + Math.PI / 6) * headLength
  );
  context.closePath();
  context.fill();
};

export const drawDebugOverlay = (
  context: CanvasRenderingContext2D,
  framePacket: FramePacket,
  debugSnapshot: DebugSnapshot
): void => {
  context.save();

  if (debugSnapshot.overlayToggles.horizonLine) {
    context.strokeStyle = "rgba(255, 255, 255, 0.24)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, framePacket.camera.horizonY);
    context.lineTo(context.canvas.clientWidth || context.canvas.width, framePacket.camera.horizonY);
    context.stroke();
  }

  if (debugSnapshot.overlayToggles.roadGeometry) {
    context.lineWidth = 1.5;
    context.strokeStyle = "rgba(65, 233, 255, 0.92)";
    drawPolyline(context, framePacket.debug.centerline);
    context.strokeStyle = "rgba(255, 207, 102, 0.88)";
    drawPolyline(context, framePacket.debug.leftEdge);
    drawPolyline(context, framePacket.debug.rightEdge);
  }

  if (debugSnapshot.overlayToggles.sampleDots) {
    context.fillStyle = "rgba(248, 246, 233, 0.8)";
    for (const point of framePacket.debug.sampleDots) {
      context.beginPath();
      context.arc(point.x, point.y, 2, 0, Math.PI * 2);
      context.fill();
    }
  }

  if (debugSnapshot.overlayToggles.seamMarkers && framePacket.debug.seamY !== null) {
    context.strokeStyle = "rgba(255, 96, 96, 0.95)";
    context.lineWidth = 2;
    context.setLineDash([10, 6]);
    context.beginPath();
    context.moveTo(0, framePacket.debug.seamY);
    context.lineTo(context.canvas.clientWidth || context.canvas.width, framePacket.debug.seamY);
    context.stroke();
    context.setLineDash([]);
  }

  if (debugSnapshot.overlayToggles.orientationGizmos) {
    const { x, y } = framePacket.debug.orientationOrigin;
    context.fillStyle = "rgba(12, 18, 28, 0.72)";
    context.beginPath();
    context.arc(x, y, 30, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.22)";
    context.lineWidth = 1;
    context.beginPath();
    context.arc(x, y, 30, 0, Math.PI * 2);
    context.stroke();

    drawVector(context, x, y, debugSnapshot.roadTangent, 42, "#41e9ff");
    drawVector(context, x, y, debugSnapshot.cameraHeading, 36, "#f47fff");
    drawVector(context, x, y, debugSnapshot.carHeading, 32, "#ffe36a");
    drawVector(context, x, y, debugSnapshot.velocityDirection, 28, "#ff9d4d");
  }

  context.restore();
};
