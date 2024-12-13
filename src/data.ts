export type Sym = string;

export type Isotope = {
  sym: Sym;

  protons: number;
  mass: number;

  abundance: number;
} & (
  | {
      half_life: number;
      alpha: number;
      beta: number;
    }
  | {
      half_life: null;
    }
);

export type ElementType =
  | "Non-Metal"
  | "Noble Gas"
  | "Alkali Metal"
  | "Alkaline Earth Metal"
  | "Metalloid"
  | "Halogen"
  | "Post-Transition Metal"
  | "Transition Metal"
  | "Lanthanide"
  | "Actinide";

export interface PElement {
  name: string;
  symbol: string;

  mass: number;

  type: ElementType;

  // hex color encoded as an integer
  cpkHexColor: number;
}

export interface Data {
  elements: PElement[];
  elementSymbolMap: { [elem: string]: number };
  isotopes: {
    [iso: Sym]: Isotope;
  };
}

// dummy data until data loads
let data: Data = {
  elements: [],
  elementSymbolMap: {},
  isotopes: {},
};
export default data;

export let allElements: Isotope[] = [];

export const dataPromise = (async () => {
  await new Promise((res) => addEventListener("load", res, { once: true }));

  const request = await fetch("/pub/data.json");
  const newData = await request.json();

  Object.assign(data, newData);

  for (let i = 0; i < data.elements.length; i++) {
    const element = data.elements[i];
    if (!element) continue;
    data.elementSymbolMap[element.symbol] = i;
  }

  allElements = [...Object.values(data.isotopes)];

  // @ts-ignore
  window.allElements = allElements;
  // @ts-ignore
  window.data = data;
})();

// utility functions

export function getSym(mass: number, protons: number): Sym {
  const elem = data.elements[protons].symbol;

  return `${elem}-${mass}`;
}
