import data, { getSym, Isotope, type Sym } from "./data";

export interface Composition {
  isotopes: {
    [isotope: Sym]: number;
  };
  isStable: boolean;
}

export let timescale = 1;
export function setTimescale(t: number) {
  timescale = t;
}

export class Block {
  composition: Composition;
  width: number;
  height: number;
  history: [number, Composition][];

  /**
    Create an element of a solid value.
  */
  constructor(all: Sym, width: number, height: number) {
    this.composition = { isotopes: { [all]: 1.0 }, isStable: false };
    this.width = width;
    this.height = height;
    this.history = [];
  }

  /**
    Simulates radioactive decay for the specified time.

    @param time The amount of time to simulate, in seconds.
  */
  tick(time: number) {
    if (this.composition.isStable) {
      return;
    }
    const composition = this.composition.isotopes;

    const isotopes = Object.keys(composition).flatMap(
      (isotope): Isotope | [] => data.isotopes[isotope] ?? [],
    );
    isotopes.sort((a, b) => {
      // math reasons; order the arrays such that isotopes higher in the decay chain are processed
      // before isotopes lower in the decay chain
      function key(val: Isotope): number {
        const protons = val.protons,
          neutrons = val.mass - protons;
        const alpha = (protons + neutrons) / 4;
        const beta = (protons - neutrons) / 2;

        // (alpha * 2) + beta == protons, (alpha * 2) - beta == neutrons
        if (!(alpha * 2 + beta == protons && alpha * 2 - beta == neutrons)) {
          throw 1;
        }
        return alpha + beta;
      }
      return key(b) - key(a);
    });
    const visited = new Set(isotopes.map((iso) => iso.sym));

    let didDecay = false;

    for (const isotope of isotopes) {
      if (isotope?.half_life == null) {
        // isotope is stable
        continue;
      }
      didDecay = true;

      const sym = isotope.sym;

      // this math isn't perfect but it's close enough for practical purposes.
      // also everything still sums to 1 and i'm not doing calculus for this
      let totalDecayed =
        composition[sym] * (1 - 2 ** ((-time * timescale) / isotope.half_life));

      composition[sym] -= totalDecayed;
      if (composition[sym] < 1e-6) {
        // fudge the decay a bit to get cleaner results
        totalDecayed += composition[sym];
        delete composition[sym];
      }

      // isotope.alpha + isotope.beta is guaranteed to === 1
      // also, rollup typescript (not zed typescript tho) isn't smart enough to infer these :(
      const alphaDecayed = totalDecayed * (isotope as any).alpha;
      const betaDecayed = totalDecayed * (isotope as any).beta;

      const addDecay = (
        decayedPortion: number,
        newMass: number,
        newProtons: number,
      ) => {
        if (decayedPortion === 0) return;
        const decayedTo = getSym(newMass, newProtons);

        composition[decayedTo] = (composition[decayedTo] ?? 0) + decayedPortion;

        const newIso = data.isotopes[decayedTo];
        if (newIso && !visited.has(newIso.sym)) {
          visited.add(newIso.sym);
          isotopes.push(newIso);

          // YOU WERE HERE
          // Po-221 at 1s = 1s crashes the game
        }
      };

      addDecay(alphaDecayed, isotope.mass - 4, isotope.protons - 2);
      addDecay(betaDecayed, isotope.mass, isotope.protons + 1);
    }

    if (!didDecay) {
      this.composition.isStable = true;
    }

    this.history.push([time, structuredClone(this.composition)]);
  }
}

export const blocks: Map<number, Block> = new Map();
