export type Sym = string;

export interface Isotope {
  sym: Sym;

  protons: number;
  mass: number;

  half_life: number;
  alpha: number;
  beta: number;
}

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
  element: string;
  symbol: string;
  type: ElementType;
}

export interface Data {
  elements: PElement[];
  abundances: { [elem: Sym]: number };
  data: {
    [elem: Sym]: Isotope;
  };
}

// dummy data until data loads
let data: Data = {
  elements: [],
  abundances: {},
  data: {},
};
export default data;

export let allElements: Isotope[] = [];

addEventListener("load", () => {
  fetch("/pub/data.json")
    .then((resp) => resp.json())
    .then((newData) => {
      Object.assign(data, newData);
      allElements = [...Object.values(data.data)];

      // @ts-ignore
      window.allElements = allElements;
      // @ts-ignore
      window.data = data;
    });
});

// utility functions

export function getSym(mass: number, protons: number): Sym {
  const elem = data.elements[protons].symbol;

  return `${elem}-${mass}`;
}
