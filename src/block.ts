import data, { getSym, Isotope, type Sym } from "./data";

export let universeTime = 0;
export function setUniverseTime(t: number) {
  universeTime = t;
}

export class Block {
  originalSym: Sym;
  width: number;
  height: number;

  composition: {
    [isotope: Sym]: number;
  };
  isStable: boolean;
  hasBeenStable: boolean = true;
  history: {
    time: number;
    isotopes: {
      [isotope: Sym]: number;
    };
  }[];

  lifetime: number;

  allIsotopes: Set<Sym>;

  /**
    Create an element of a solid value.
  */
  constructor(all: Sym, width: number, height: number) {
    this.originalSym = all;

    this.composition = { [all]: 1.0 };
    this.isStable = data.isotopes[all].half_life === null;

    this.width = width;
    this.height = height;
    this.history = [
      {
        time: 0,
        isotopes: structuredClone(this.composition),
      },
    ];

    this.lifetime = 0;

    this.allIsotopes = new Set();
  }

  /**
    What's the isotope that this block has the most of?
  */
  approximate(): [Sym, number] {
    return Object.entries(this.composition).reduce((a, b) =>
      a[1] > b[1] ? a : b,
    );
  }

  /**
    Simulates radioactive decay for the specified time.

    @param delta The amount of time to simulate, in seconds.
  */
  tick(delta: number) {
    if (this.isStable) {
      return;
    }
    const composition = this.composition;

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
      const remainingFac = 1 - 2 ** (-delta / isotope.half_life);
      let totalDecayed = composition[sym] * remainingFac;

      composition[sym] -= totalDecayed;
      if (composition[sym] < remainingFac ** 0.5 * 1e-3) {
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
        }
      };

      addDecay(alphaDecayed, isotope.mass - 4, isotope.protons - 2);
      addDecay(betaDecayed, isotope.mass, isotope.protons + 1);
    }

    if (!didDecay) this.isStable = true;

    this.lifetime += delta;
  }

  saveHistory() {
    this.history.push({
      time: this.lifetime,
      isotopes: structuredClone(this.composition),
    });

    for (const key in this.composition) {
      this.allIsotopes.add(key);
    }
  }
}

export const blocks: Map<number, Block> = new Map();
