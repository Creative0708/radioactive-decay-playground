export const jsonPromise = import("../scripts/dist/data.json");

export type Sym = string;

export interface Isotope {
  elem: Sym;

  protons: number;
  mass: number;

  half_life: number;
  alpha: number;
  beta: number;
}

export interface Data {
  symbols: string[];
  data: {
    [elem: Sym]: Isotope;
  };
}

// shhhhhhhhhhhhhh
let data = null as any as Data;
export default data;

jsonPromise.then((newData) => {
  data = newData;
});

// utility functions

export function getSym(mass: number, protons: number): Sym {
  const elem = data.symbols[protons];

  return `${elem}-${mass}`;
}
