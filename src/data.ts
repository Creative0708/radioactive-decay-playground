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
  element: string;
  symbol: string;
  type: ElementType;

  // hex color encoded as an integer
  cpkHexColor: number;
}

export interface Data {
  elements: PElement[];
  isotopes: {
    [elem: Sym]: Isotope;
  };
}

// dummy data until data loads
let data: Data = {
  elements: [],
  isotopes: {},
};
export default data;

export let allElements: Isotope[] = [];

addEventListener("load", () => {
  fetch("/pub/data.json")
    .then((resp) => resp.json())
    .then((newData) => {
      Object.assign(data, newData);
      allElements = [...Object.values(data.isotopes)];

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
