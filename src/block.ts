import data, { getSym, Isotope, type Sym } from "./data";

export class Block {
  composition: { [isotope: Sym]: number };
  width: number;
  height: number;

  /**
    Create an element of a solid value.
  */
  constructor(all: Sym, width: number, height: number) {
    this.composition = { [all]: 1.0 };
    this.width = width;
    this.height = height;
  }

  /**
    Simulates radioactive decay for the specified time.

    @param time The amount of time to simulate, in seconds.
  */
  tick(time: number) {
    const isotopes = Object.keys(this.composition).map(
      (isotope) => data.isotopes[isotope],
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
      return key(a) - key(b);
    });

    for (const isotope of isotopes) {
      if (isotope?.half_life == null) {
        // isotope is stable
        continue;
      }
      const sym = isotope.sym;

      // this math isn't perfect but it's close enough for practical purposes.
      // also everything still sums to 1 and i'm not doing calculus for this
      const decayed_fraction = 1 - 2 ** (-time / isotope.half_life);
      const total_decayed = this.composition[sym] * decayed_fraction;
      this.composition[sym] -= total_decayed;

      // isotope.alpha + isotope.beta is guaranteed to === 1
      // also, rollup typescript (not zed typescript tho) isn't smart enough to infer these :(
      const alpha_decayed = total_decayed * (isotope as any).alpha;
      const beta_decayed = total_decayed * (isotope as any).beta;

      if (alpha_decayed) {
        const decayed_to = getSym(isotope.mass - 4, isotope.protons - 2);
        this.composition[decayed_to] =
          (this.composition[decayed_to] ?? 0) + alpha_decayed;
      }
      if (beta_decayed) {
        const decayed_to = getSym(isotope.mass, isotope.protons + 1);
        this.composition[decayed_to] =
          (this.composition[decayed_to] ?? 0) + beta_decayed;
      }
    }
  }
}

export const blocks: Map<number, Block> = new Map();
