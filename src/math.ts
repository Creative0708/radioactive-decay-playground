import { render } from "./app";

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
