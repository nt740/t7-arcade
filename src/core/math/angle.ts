const TAU = Math.PI * 2;

export const wrapAngle = (angle: number): number => {
  let wrapped = angle % TAU;
  if (wrapped <= -Math.PI) {
    wrapped += TAU;
  } else if (wrapped > Math.PI) {
    wrapped -= TAU;
  }

  return wrapped;
};

export const shortestAngleDelta = (from: number, to: number): number => wrapAngle(to - from);

export const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const radiansToDegrees = (radians: number): number => (radians * 180) / Math.PI;
