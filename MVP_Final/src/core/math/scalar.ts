export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, alpha: number): number => from + (to - from) * alpha;

export const inverseLerp = (from: number, to: number, value: number): number => {
  if (from === to) {
    return 0;
  }

  return (value - from) / (to - from);
};

export const smoothstep = (from: number, to: number, value: number): number => {
  const x = clamp(inverseLerp(from, to, value), 0, 1);
  return x * x * (3 - 2 * x);
};

export const damp = (current: number, target: number, smoothing: number, deltaSeconds: number): number => {
  const factor = 1 - Math.exp(-smoothing * deltaSeconds);
  return lerp(current, target, factor);
};
