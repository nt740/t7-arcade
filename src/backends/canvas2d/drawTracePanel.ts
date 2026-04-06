import type { DebugHistorySample } from "../../debug/debugHistoryBuffer";
import type { DebugSnapshot } from "../../core/types/debug";

const drawPanel = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string
): void => {
  context.fillStyle = "rgba(8, 15, 24, 0.76)";
  context.strokeStyle = "rgba(255, 255, 255, 0.12)";
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(x, y, width, height, 12);
  context.fill();
  context.stroke();
  context.fillStyle = "rgba(237, 243, 255, 0.88)";
  context.font = '12px "IBM Plex Mono", monospace';
  context.fillText(title, x + 12, y + 18);
};

const drawTraceSet = (
  context: CanvasRenderingContext2D,
  samples: DebugHistorySample[],
  x: number,
  y: number,
  width: number,
  height: number,
  channels: Array<{ color: string; value: (sample: DebugHistorySample) => number }>,
  amplitude: number
): void => {
  if (samples.length < 2) {
    return;
  }

  const graphTop = y + 28;
  const graphHeight = height - 40;
  const graphBottom = graphTop + graphHeight;
  const centerY = graphTop + graphHeight * 0.5;
  const startTime = samples[0].timestampMs;
  const endTime = samples[samples.length - 1].timestampMs;
  const timeSpan = Math.max(1, endTime - startTime);

  context.strokeStyle = "rgba(255, 255, 255, 0.14)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x + 10, centerY);
  context.lineTo(x + width - 10, centerY);
  context.stroke();

  for (const channel of channels) {
    context.strokeStyle = channel.color;
    context.lineWidth = 1.5;
    context.beginPath();
    samples.forEach((sample, index) => {
      const t = (sample.timestampMs - startTime) / timeSpan;
      const graphX = x + 10 + t * (width - 20);
      const normalized = Math.max(-1, Math.min(1, channel.value(sample) / amplitude));
      const graphY = centerY - normalized * (graphHeight * 0.42);
      if (index === 0) {
        context.moveTo(graphX, graphY);
      } else {
        context.lineTo(graphX, graphY);
      }
    });
    context.stroke();
  }

  context.fillStyle = "rgba(237, 243, 255, 0.62)";
  context.font = '10px "IBM Plex Mono", monospace';
  context.fillText("0", x + width - 18, centerY - 4);
  context.fillText(`${amplitude.toFixed(2)}`, x + width - 34, graphTop + 10);
  context.fillText(`-${amplitude.toFixed(2)}`, x + width - 40, graphBottom - 4);
};

export const drawTracePanel = (
  context: CanvasRenderingContext2D,
  samples: DebugHistorySample[],
  debugSnapshot: DebugSnapshot
): void => {
  if (!debugSnapshot.overlayToggles.traceGraphs) {
    return;
  }

  const panelWidth = 280;
  const panelHeight = 108;
  const gap = 14;
  const leftX = 16;
  const baseY = Math.max(16, context.canvas.clientHeight - panelHeight * 2 - gap - 16);

  drawPanel(context, leftX, baseY, panelWidth, panelHeight, "Lateral / Recovery");
  drawTraceSet(
    context,
    samples,
    leftX,
    baseY,
    panelWidth,
    panelHeight,
    [
      { color: "#72dfff", value: (sample) => sample.laneOffset / 90 },
      { color: "#7cff9f", value: (sample) => sample.lateralVelocity / 120 },
      { color: "#ffe36a", value: (sample) => sample.headingError },
      { color: "#ff9d4d", value: (sample) => sample.slipAngle }
    ],
    1
  );

  drawPanel(context, leftX, baseY + panelHeight + gap, panelWidth, panelHeight, "Orientation");
  drawTraceSet(
    context,
    samples,
    leftX,
    baseY + panelHeight + gap,
    panelWidth,
    panelHeight,
    [
      { color: "#41e9ff", value: (sample) => sample.roadTangent },
      { color: "#ffe36a", value: (sample) => sample.carHeading },
      { color: "#f47fff", value: (sample) => sample.cameraHeading },
      { color: "#ff9d4d", value: (sample) => sample.velocityDirection }
    ],
    1
  );
};
