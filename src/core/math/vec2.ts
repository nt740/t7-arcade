import type { Vec2 } from "../types/common";

export const vec2 = (x = 0, y = 0): Vec2 => ({ x, y });

export const addVec2 = (left: Vec2, right: Vec2): Vec2 => ({
  x: left.x + right.x,
  y: left.y + right.y
});

export const scaleVec2 = (value: Vec2, scalar: number): Vec2 => ({
  x: value.x * scalar,
  y: value.y * scalar
});
