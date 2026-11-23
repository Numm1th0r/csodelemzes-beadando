"""A kész (modellezésre előkészített) adat feltöltése a Neon Postgresbe.

Használat:  .venv/bin/python -I scripts/load_neon.py
A kapcsolatot a .env.local DATABASE_URL_UNPOOLED változójából veszi (betöltéshez direkt kapcsolat kell).
Újrafuttatható: a táblákat eldobja és újratölti.

Táblák:
  adatok         – a kész tábla: X37 nélkül, winsorizálva (1–99. percentilis), mediánnal pótolva,
                   hiányjelzők az X21 és X27 mellé (scripts/prep.py állítja elő)
  mutato_szotar  – melyik mutató mit jelent, melyik csoportba tartozik
"""
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")
X = [f"x{i}" for i in range(1, 65) if i != 37]

SCHEMA = f"""
DROP VIEW IF EXISTS v_csodarany, v_kulcsmutatok_median;
DROP TABLE IF EXISTS modell_kesz, megfigyeles, adatok, mutato_szotar;

CREATE TABLE mutato_szotar (
    mutato      text PRIMARY KEY,
    leiras      text NOT NULL,
    csoport     text NOT NULL,
    hiany_arany double precision   -- hiányarány a pótlás előtt
);

CREATE TABLE adatok (
    id          integer PRIMARY KEY,
    ev_a_csodig smallint NOT NULL CHECK (ev_a_csodig BETWEEN 1 AND 5),
    forras_fajl text NOT NULL,
    csod        boolean NOT NULL,
    {", ".join(f"{c} double precision NOT NULL" for c in X)},
    hiany_x21   smallint NOT NULL,
    hiany_x27   smallint NOT NULL
);
CREATE INDEX ON adatok (ev_a_csodig, csod);
COMMENT ON TABLE adatok IS 'Polish companies bankruptcy data (UCI #365), kész tábla: duplikátumok nélkül, X37 nélkül, winsorizálva (1-99. percentilis), mediánnal pótolva, hiányjelzők az X21 és X27 mellé. ev_a_csodig: hány évvel a státusz előtt mért mutatók.';

CREATE VIEW v_csodarany AS
SELECT ev_a_csodig, count(*) AS megfigyeles, count(*) FILTER (WHERE csod) AS csod,
       round(avg(csod::int)::numeric, 4) AS arany
FROM adatok GROUP BY ev_a_csodig ORDER BY ev_a_csodig;

CREATE VIEW v_kulcsmutatok_median AS
SELECT ev_a_csodig, CASE WHEN csod THEN 'Csődbe ment' ELSE 'Működő' END AS statusz,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY x1)  AS roa_x1,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY x7)  AS ebit_eszkoz_x7,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY x2)  AS kotelezettseg_eszkoz_x2,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY x10) AS sajat_toke_eszkoz_x10,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY x4)  AS likviditasi_rata_x4,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY x46) AS gyorsrata_x46,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY x40) AS penzeszkoz_rata_x40
FROM adatok GROUP BY ev_a_csodig, csod ORDER BY ev_a_csodig, csod;
"""


def main() -> None:
    with psycopg.connect(os.environ["DATABASE_URL_UNPOOLED"]) as conn, conn.cursor() as cur:
        cur.execute(SCHEMA)
        with cur.copy("COPY mutato_szotar FROM STDIN (FORMAT csv, HEADER true)") as cp:
            cp.write((ROOT / "data_clean/mutato_szotar.csv").read_bytes())
        cur.execute("UPDATE mutato_szotar SET mutato = lower(mutato)")
        # CSV oszlopsorrend: id, ev_a_csodig, forras_fajl, X1..X64 (X37 nélkül), csod, hiany_X21, hiany_X27
        cols = ", ".join(["id", "ev_a_csodig", "forras_fajl", *X, "csod", "hiany_x21", "hiany_x27"])
        with cur.copy(f"COPY adatok ({cols}) FROM STDIN (FORMAT csv, HEADER true)") as cp:
            cp.write((ROOT / "data_clean/polish_modell_kesz.csv").read_bytes())
        conn.commit()
        cur.execute("SELECT (SELECT count(*) FROM adatok), (SELECT count(*) FROM mutato_szotar)")
        print("Feltöltve – adatok: %d sor, mutato_szotar: %d sor" % cur.fetchone())
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1")
        print("Táblák/nézetek:", [r[0] for r in cur.fetchall()])


if __name__ == "__main__":
    main()
