# Csődelemzés – Adatbányászat beadandó

A csődöt megelőző 1–5 év pénzügyi mutatóinak elemzése a *Polish companies bankruptcy data* (UCI #365) adatsoron.

## Mappák
- `data_raw/` – az eredeti UCI adatok (5 db ARFF fájl)
- `data_clean/polish_modell_kesz.csv` – **a kész tábla** (ugyanez van a Neon adatbázis `adatok` táblájában)
- (`data_clean/polish_clean.csv` köztes fájl, nincs a repóban – a `prep.py` létrehozza; a notebook ezt használja)
- `data_clean/mutato_szotar.csv` – melyik mutató (X1–X64) mit jelent, melyik csoportba tartozik
- `scripts/prep.py` – adattisztítás (nyers → kész tábla)
- `scripts/load_neon.py` – feltöltés a Neon adatbázisba
- `notebooks/elemzes.ipynb` – első elemzések (leíró, modellek, klaszterezés)
- `abrak/` – ábrák
- `MASTER_PROMPT.md` – bemásolható prompt a saját Claude-otokhoz, hogy egyből képben legyen
- `Csapat_osszefoglalo.docx` – rövid összefoglaló a csapatnak
- `Adatelokeszites_es_kutatasi_kerdesek.docx` – hosszabb, dolgozatba szánt változat

## Adatbázis
Neon Postgres, csak olvasási hozzáférés. A `DATABASE_URL`-t privátban kapjátok, tegyétek egy `.env` fájlba (ne commitoljátok!).

```sql
SELECT * FROM adatok LIMIT 10;
SELECT * FROM mutato_szotar;
```

## Futtatás
```bash
python -m venv .venv && .venv/bin/pip install pandas scipy scikit-learn matplotlib seaborn liac-arff xgboost jupyter "psycopg[binary]" python-dotenv
.venv/bin/python scripts/prep.py data_raw data_clean
```
