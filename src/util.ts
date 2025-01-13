import data, { Isotope, PElement, Sym } from "./data";

export function rgbToHex(r: number, g: number, b: number): string {
  function component(num: number): string {
    return ((num < 0 ? 0 : num > 255 ? 255 : num) | 0)
      .toString(16)
      .padStart(2, "0");
  }
  return `#${component(r)}${component(g)}${component(b)}`;
}

const clamp127 = (x: number) => (x < 0 ? 0 : x > 127 ? 127 : x);

export function getDarkColorForIsotope(
  iso: Isotope | Sym | undefined,
): [number, number, number] {
  let protons: number | undefined, mass: number | undefined;
  if (typeof iso === "string") {
    const [elem, strMass] = iso.split("-");
    protons = data.elementSymbolMap[elem];
    mass = +strMass;
  } else {
    protons = iso?.protons;
    mass = iso?.mass;
  }
  if (protons === undefined) return [80, 80, 80];

  const element = data.elements[protons];
  const hex = element.cpkHexColor;

  // based on mass; heavier elements are darker
  const nudge = Math.round((1 - mass! / element.mass) * (1.5 * element.mass));

  return [
    clamp127((hex >> 17) + nudge),
    clamp127(((hex >> 9) & 0x7f) + nudge),
    clamp127(((hex >> 1) & 0x7f) + nudge),
  ];
}

export function getFullNameForIsotope(iso: Sym): string {
  const [elSym, mass] = iso.split("-");

  const element = data.elements[data.elementSymbolMap[elSym]];

  return `${element.name}-${mass}`;
}

function formatNumber(num: number, digits: number = 2): string {
  let log10 = Math.log10(num) | 0;

  if (log10 > 0 ? log10 > digits + 1 : log10 < -digits) {
    return `${(num / 10 ** log10).toFixed(2)} ⋅ 10<sup>${log10}</sup>`;
  }
  if (log10 > digits) {
    return num.toFixed(0);
  }
  return num.toFixed(digits - log10);
}

import * as SI_UNITS_RAW from "./si_units.json";
// treat object of integer keys as string
const SI_UNITS = (SI_UNITS_RAW as any).default as string[];

export interface FormatResult {
  html: string;
  multiplier: number;
  unit: string;
}

export function formatSIUnit(
  num: number,
  unit: string,
  digits?: number,
): FormatResult {
  let log10 = Math.floor(Math.log10(num));
  while (SI_UNITS[log10] === undefined && log10 >= -30) {
    log10--;
  }
  if (log10 < -30) log10 = -30;

  unit = SI_UNITS[log10] + unit;
  const multiplier = 10 ** -log10;
  return {
    html: `${formatNumber(num * multiplier, digits)} ${unit}`,
    multiplier,
    unit,
  };
}
export function formatSeconds(num: number, digits?: number): FormatResult {
  if (num < 1) {
    return formatSIUnit(num, "s", digits);
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

  const multiplier = 1 / divisor;

  return {
    html: `${formatNumber(num * multiplier, digits)} ${unit}`,
    multiplier: multiplier,
    unit,
  };
}
