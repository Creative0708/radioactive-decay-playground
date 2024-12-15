import os, os.path as path
dirname = path.abspath(path.join(__file__, path.pardir))

import math
from typing import Any
import time, json

with open(path.join(dirname, "ptable.json"), "r") as f:
    ptable = json.load(f)

try:
    from nudel import Nuclide
    from nudel.util import Units

    unit_second = [unit for unit in Units if unit.symb == "s"][0]
    unit_probability = [unit for unit in Units if unit.symb == ""][0]

    alpha_aliases = ["A"]
    beta_aliases = [
        "B-", # beta decay
        "B-N", # beta decay with delayed neutron?
        "EC+%B+", # electron capture with beta-plus decay, which if i'm reading wikipedia right is equivalent to beta-minus decay?
    ]

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

except ModuleNotFoundError:
    # silently ignore; process_isotopes() will execvp the process with the correct path anyways
    pass

def process_isotope(mass, protons):
    if mass == 0 or protons == 0:
        # ????
        return

    try:
        nuclide = Nuclide(mass, protons)
    except:
        # guess what? nudel errors on some isotopes
        return
    try:
        sym = f"{ptable[nuclide.protons]["symbol"]}-{nuclide.mass}"
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

            if alpha < 0.01 and beta < 0.01:
                # there's no alpha or nebeta decay in this level; skip it
                continue

            if abs(alpha + beta - 1.0) > 0.1:
                print(f"alpha + beta != 1 for {sym}, ignoring:\n{decay_ratio = }")
                continue

            # normalize alpha & beta
            tot = alpha + beta
            alpha /= tot
            beta /= tot

            break
        else:
            # if there were no levels with alpha/beta decay, this isotope is probably not radioactive
            return

        print(f"finished processing {sym:>6}")
        return sym, {
            "sym": sym,

            "protons": nuclide.protons,
            "mass": nuclide.mass,

            "half_life": half_life,

            "alpha": alpha,
            "beta": beta,
        }
    except:
        print(f"exception while processing {sym}")
        raise

def process_isotopes():
    try:
        import nudel
    except ModuleNotFoundError:
        import os, sys
        already_tried_key = "MAKE_JSON_ALREADY_TRIED"
        if os.environ.get(already_tried_key):
            raise

        bin_path = path.join(dirname, "venv", "bin")
        if not path.exists(bin_path):
            raise Exception("venv doesn't exist :( try `python3 -m venv venv` then install from requirements.txt in there")
        os.environ["PATH"] = bin_path + ":" + os.environ["PATH"]
        os.environ[already_tried_key] = "1"

        os.execvpe("python3", ["python3", *sys.argv], os.environ)

    ensdf = nudel.get_active_ensdf()

    nuclides = ensdf.get_indexed_nuclides()

    print(f"loaded {len(nuclides)} nuclides")

    from multiprocessing import Pool

    res = {}
    with Pool() as pool:
        start_time = time.time()
        for isotope_res in pool.starmap(process_isotope, nuclides):
            if isotope_res is None:
                continue
            (name, data) = isotope_res
            res[name] = data
        total_time = time.time() - start_time
        print(f"finished processing in {total_time:.03}s")

    return res


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        prog="make_json.py",
        description="Creates the dataset for the project"
    )

    parser.add_argument("-n", "--no-process-ensdf", action="store_true", help="read ensdf data from already-processed json file instead of processing from installed ensdf")
    args = parser.parse_args()

    out_path = path.join(dirname, "dist", "data.json")

    if args.no_process_ensdf:
        with open(out_path, "r") as f:
            isotopes = json.load(f)["isotopes"]
    else:
        isotopes = process_isotopes()

    elements = [
        val and ({
            "name": val["element"],
            "symbol": val["symbol"],
            "type": val["type"],
            "cpkHexColor": val["cpkHexColor"],
            "mass": val["atomicMass"]
        }) for val in ptable
    ]


    with open(path.join(dirname, "abundances.json"), "r") as f:
        abundances: dict = json.load(f)
    for isotope in isotopes.values():
        isotope["abundance"] = 0
    elem_to_protons = { elem["symbol"]: elem["numberOfProtons"] for elem in ptable if elem }
    for sym, val in abundances.items():
        if sym not in isotopes:
            # add stable element
            if val is None:
                continue

            element, mass = sym.split("-")
            protons = elem_to_protons[element]
            mass = int(mass)
            isotopes[sym] = {
                "sym": sym,

                "protons": protons,
                "mass": mass,

                "half_life": None,
            }

        isotopes[sym]["abundance"] = val * 0.01

    data = {
        "elements": elements,
        "isotopes": isotopes,
    }

    print(f"outputting to {out_path}")

    try:
        os.mkdir(path.dirname(out_path))
    except FileExistsError:
        pass

    with open(out_path, "w") as f:
        json.dump(data, f, separators=(",", ":"))
