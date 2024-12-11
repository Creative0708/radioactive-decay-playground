import { PElement } from "./data";

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
export function getDarkColorForElement(
  element: PElement,
): [number, number, number] {
  const hex = element.cpkHexColor;

  return [hex >> 17, (hex >> 9) & 0x7f, (hex >> 1) & 0x7f];
}
