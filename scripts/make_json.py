import math
from typing import Any
from nudel import get_active_ensdf, Nuclide
from nudel.util import Units, ELEMENTS
from threading import Lock
import time

start_time = time.time()

ensdf = get_active_ensdf()

unit_second = [unit for unit in Units if unit.symb == "s"][0]
unit_probability = [unit for unit in Units if unit.symb == ""][0]

alpha_aliases = ["A"]
beta_aliases = ["B-", "B-N", "EC+%B+"]

nuclides = ensdf.get_indexed_nuclides()

def sum_aliases(vals: dict[str, Any], aliases: list[str]):
    tot = 0
    for alias in aliases:
        val = vals.get(alias)
        if val is None:
            continue
        val = val.cast_to_unit(unit_probability).val
        if math.isnan(val):
            continue
        tot += val
    return tot

def process(mass, protons):
    global nuclide_counter

    try:
        nuclide = Nuclide(mass, protons)
    except:
        # guess what? nudel errors on some isotopes
        return
    try:
        name = f"{ELEMENTS[nuclide.protons]}-{nuclide.mass}"
    except IndexError:
        # ?????????
        return

    try:
        for level in nuclide.adopted_levels.levels:
            half_life = level.half_life
            decay_ratio = level.decay_ratio
            if math.isnan(half_life.val) or half_life.unit is None:
                # yeah me neither
                continue
            try:
                half_life = half_life.cast_to_unit(unit_second).val
            except TypeError:
                # for "observationally stable" isotopes such as Ar-36 nudel parses the data wrong
                continue

            alpha = sum_aliases(decay_ratio, alpha_aliases)
            beta = sum_aliases(decay_ratio, beta_aliases)

            if alpha < 0.01 and beta <= 0.01:
                # there's no alpha or beta decay in this level; skip it
                continue

            if abs(alpha + beta - 1.0) > 0.1:
                print(f"alpha + beta != 1 for {name}, ignoring:\n{decay_ratio = }")
                continue

            # normalize alpha & beta
            tot = alpha + beta
            alpha /= tot
            beta /= tot

            break
        else:
            # if there were no levels with alpha/beta decay, this isotope is probably not radioactive
            return

        print(f"finished processing {name:>6}")
        return name, {
            "protons": nuclide.protons,
            "mass": nuclide.mass,

            "half_life": half_life,

            "alpha": alpha,
            "beta": beta,
        }
    except:
        print(f"exception while processing {name}")
        raise

if __name__ == "__main__":
    import os.path as path, json
    from multiprocessing import Pool
    print(f"loaded {len(nuclides)} nuclides")

    res = {}
    with Pool() as pool:
        for isotope_res in pool.starmap(process, nuclides):
            if isotope_res is None:
                continue
            (name, data) = isotope_res
            res[name] = data


    data = {
        "symbols": ELEMENTS,
        "decay_data": res,
    }

    dirname = path.abspath(path.join(__file__, path.pardir))
    out_path = path.join(dirname, "dist", "data.json")
    print(f"outputting to {out_path}")

    with open(out_path, "w") as f:
        json.dump(data, f, separators=(",", ":"))
