import { render } from "./paint";

export const TAU = Math.PI * 2;

export function lerp(
  from: number,
  to: number,
  fac: number,
  threshold = 1,
): number {
  if (Math.abs(from - to) < threshold) {
    return to;
  }
  return to + (from - to) * Math.exp(-fac * render.delta);
}
