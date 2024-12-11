import { render } from "./app";

export function lerp(from: number, to: number, fac: number): number {
  if (Math.abs(from - to) < 1) {
    return to;
  }
  return to + (from - to) * Math.exp(-fac * render.delta);
}
