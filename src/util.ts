import data, { Isotope, PElement, Sym } from "./data";

export function rgbToHex(r: number, g: number, b: number): string {
  function component(num: number): string {
    return (num < 0 ? 0 : num > 255 ? 255 : num).toString(16).padStart(2, "0");
  }
  return `#${component(r)}${component(g)}${component(b)}`;
}
export function getDarkColorForIsotope(
  iso: Isotope | Sym | undefined,
): [number, number, number] {
  const protons =
    typeof iso === "string"
      ? data.elementSymbolMap[iso.split("-")[0]]
      : iso?.protons;
  if (protons == null) return [80, 80, 80];

  const element = data.elements[protons];
  const hex = element.cpkHexColor;

  return [hex >> 17, (hex >> 9) & 0x7f, (hex >> 1) & 0x7f];
}

function formatNumber(num: number): string {
  let log10 = Math.log10(num) | 0;

  if (num >= 1 ? log10 > 3 : log10 < -2) {
    return `${(num / 10 ** log10).toFixed(2)} ⋅ 10<sup>${log10}</sup>`;
  }
  if (log10 > 2) {
    return num.toFixed(0);
  }
  return num.toFixed(2 - log10);
}

import * as SI_UNITS_RAW from "./si_units.json";
// treat object of integer keys as string
const SI_UNITS = (SI_UNITS_RAW as any).default as string[];

export function formatSIUnit(num: number, unit: string) {
  let log10 = Math.floor(Math.log10(num));
  while (SI_UNITS[log10] === undefined && log10 >= -30) {
    log10--;
  }
  if (log10 < -30) log10 = -30;
  return `${formatNumber(num / 10 ** log10)} ${SI_UNITS[log10]}${unit}`;
}
export function formatSeconds(num: number): string {
  if (num < 1) {
    return formatSIUnit(num, "s");
  }
  let divisor = 1,
    unit = "s";
  for (const [divisor2, unit2] of [
    [60, "min"],
    [60 * 60, "h"],
    [60 * 60 * 24, "d"],
    [60 * 60 * 24 * 365.5, "yr"],
  ] satisfies [number, string][]) {
    if (num < divisor2) {
      break;
    }
    divisor = divisor2;
    unit = unit2;
  }

  return `${formatNumber(num / divisor)} ${unit}`;
}
