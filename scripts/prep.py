"""Adatelőkészítés: a lengyel csődadatsor (UCI #365) beolvasása, összefűzése, tisztítása.

Használat:  .venv/bin/python -I scripts/prep.py data_raw data_clean
Kimenet:    data_clean/polish_clean.csv   (egy sor = egy cég-év megfigyelés)
            data_clean/mutato_szotar.csv  (Attr1..64 jelentése + mutatócsoport)
"""
import sys
from pathlib import Path

import arff
import numpy as np
import pandas as pd

# Attr1..Attr64 jelentése (Tomczak, UCI leírás) + saját csoportosítás
MUTATOK = {
    1: ("net profit / total assets", "jövedelmezőség"),
    2: ("total liabilities / total assets", "eladósodottság"),
    3: ("working capital / total assets", "likviditás"),
    4: ("current assets / short-term liabilities", "likviditás"),
    5: ("[(cash + short-term securities + receivables - short-term liabilities) / (operating expenses - depreciation)] * 365", "likviditás"),
    6: ("retained earnings / total assets", "jövedelmezőség"),
    7: ("EBIT / total assets", "jövedelmezőség"),
    8: ("book value of equity / total liabilities", "eladósodottság"),
    9: ("sales / total assets", "hatékonyság"),
    10: ("equity / total assets", "eladósodottság"),
    11: ("(gross profit + extraordinary items + financial expenses) / total assets", "jövedelmezőség"),
    12: ("gross profit / short-term liabilities", "eladósodottság"),
    13: ("(gross profit + depreciation) / sales", "jövedelmezőség"),
    14: ("(gross profit + interest) / total assets", "jövedelmezőség"),
    15: ("(total liabilities * 365) / (gross profit + depreciation)", "eladósodottság"),
    16: ("(gross profit + depreciation) / total liabilities", "eladósodottság"),
    17: ("total assets / total liabilities", "eladósodottság"),
    18: ("gross profit / total assets", "jövedelmezőség"),
    19: ("gross profit / sales", "jövedelmezőség"),
    20: ("(inventory * 365) / sales", "hatékonyság"),
    21: ("sales (n) / sales (n-1)", "növekedés"),
    22: ("profit on operating activities / total assets", "jövedelmezőség"),
    23: ("net profit / sales", "jövedelmezőség"),
    24: ("gross profit (in 3 years) / total assets", "jövedelmezőség"),
    25: ("(equity - share capital) / total assets", "eladósodottság"),
    26: ("(net profit + depreciation) / total liabilities", "eladósodottság"),
    27: ("profit on operating activities / financial expenses", "eladósodottság"),
    28: ("working capital / fixed assets", "likviditás"),
    29: ("logarithm of total assets", "méret"),
    30: ("(total liabilities - cash) / sales", "eladósodottság"),
    31: ("(gross profit + interest) / sales", "jövedelmezőség"),
    32: ("(current liabilities * 365) / cost of products sold", "likviditás"),
    33: ("operating expenses / short-term liabilities", "likviditás"),
    34: ("operating expenses / total liabilities", "eladósodottság"),
    35: ("profit on sales / total assets", "jövedelmezőség"),
    36: ("total sales / total assets", "hatékonyság"),
    37: ("(current assets - inventories) / long-term liabilities", "likviditás"),
    38: ("constant capital / total assets", "eladósodottság"),
    39: ("profit on sales / sales", "jövedelmezőség"),
    40: ("(current assets - inventory - receivables) / short-term liabilities", "likviditás"),
    41: ("total liabilities / ((profit on operating activities + depreciation) * (12/365))", "eladósodottság"),
    42: ("profit on operating activities / sales", "jövedelmezőség"),
    43: ("rotation receivables + inventory turnover in days", "hatékonyság"),
    44: ("(receivables * 365) / sales", "hatékonyság"),
    45: ("net profit / inventory", "jövedelmezőség"),
    46: ("(current assets - inventory) / short-term liabilities", "likviditás"),
    47: ("(inventory * 365) / cost of products sold", "hatékonyság"),
    48: ("EBITDA (profit on operating activities - depreciation) / total assets", "jövedelmezőség"),
    49: ("EBITDA (profit on operating activities - depreciation) / sales", "jövedelmezőség"),
    50: ("current assets / total liabilities", "likviditás"),
    51: ("short-term liabilities / total assets", "eladósodottság"),
    52: ("(short-term liabilities * 365) / cost of products sold", "likviditás"),
    53: ("equity / fixed assets", "eladósodottság"),
    54: ("constant capital / fixed assets", "eladósodottság"),
    55: ("working capital", "likviditás"),
    56: ("(sales - cost of products sold) / sales", "jövedelmezőség"),
    57: ("(current assets - inventory - short-term liabilities) / (sales - gross profit - depreciation)", "likviditás"),
    58: ("total costs / total sales", "jövedelmezőség"),
    59: ("long-term liabilities / equity", "eladósodottság"),
    60: ("sales / inventory", "hatékonyság"),
    61: ("sales / receivables", "hatékonyság"),
    62: ("(short-term liabilities * 365) / sales", "likviditás"),
    63: ("sales / short-term liabilities", "likviditás"),
    64: ("sales / fixed assets", "hatékonyság"),
}


def main(raw_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    frames = []
    for k in range(1, 6):
        with open(raw_dir / f"{k}year.arff") as f:
            d = arff.load(f)
        df = pd.DataFrame(d["data"], columns=[a[0] for a in d["attributes"]])
        df = df.rename(columns={f"Attr{i}": f"X{i}" for i in range(1, 65)})
        # kYear fájl: a k. év adatai, címke = csőd 6-k év múlva
        df.insert(0, "ev_a_csodig", 6 - k)
        df.insert(1, "forras_fajl", f"{k}year")
        frames.append(df)

    df = pd.concat(frames, ignore_index=True)
    df["csod"] = df.pop("class").astype(int)
    xcols = [f"X{i}" for i in range(1, 65)]
    df[xcols] = df[xcols].astype(float).replace([np.inf, -np.inf], np.nan)

    n0 = len(df)
    df = df.drop_duplicates()
    print(f"Sorok: {n0}, duplikátum törölve: {n0 - len(df)}, maradt: {len(df)}")
    print("Csődarány horizontonként:")
    print(df.groupby("ev_a_csodig")["csod"].agg(["count", "sum", "mean"]).round(3))
    miss = df[xcols].isna().mean().sort_values(ascending=False).head(8).round(3)
    print("Leghiányosabb mutatók:\n", miss)

    df.insert(0, "id", range(1, len(df) + 1))
    df.to_csv(out_dir / "polish_clean.csv", index=False)

    # Modellezésre kész változat:
    #  - X37 kihagyva (44% hiány, a hányados sok cégnél nem értelmezhető)
    #  - hiányjelző az X21 és X27 mellé (a hiány a csődös cégeknél sokkal gyakoribb)
    #  - winsorizálás az 1. és 99. percentilisen, majd mediánpótlás (mutatónként, a teljes adaton)
    mk = df.drop(columns=["X37"]).copy()
    for c in ["X21", "X27"]:
        mk[f"hiany_{c}"] = mk[c].isna().astype(int)
    mcols = [c for c in xcols if c != "X37"]
    lo, hi = mk[mcols].quantile(0.01), mk[mcols].quantile(0.99)
    mk[mcols] = mk[mcols].clip(lo, hi, axis=1)
    mk[mcols] = mk[mcols].fillna(mk[mcols].median())
    assert mk[mcols].isna().sum().sum() == 0
    mk.to_csv(out_dir / "polish_modell_kesz.csv", index=False)
    print(f"Modellezésre kész tábla: {mk.shape[0]} sor, {len(mcols)} mutató + 2 hiányjelző")

    szotar = pd.DataFrame(
        [(f"X{i}", leiras, csop) for i, (leiras, csop) in MUTATOK.items()],
        columns=["mutato", "leiras", "csoport"],
    )
    szotar["hiany_arany"] = szotar["mutato"].map(df[xcols].isna().mean()).round(4)
    szotar.to_csv(out_dir / "mutato_szotar.csv", index=False)
    print("Kész:", out_dir)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
