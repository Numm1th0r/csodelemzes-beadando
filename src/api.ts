// Read-only API a csődadatsor kész táblájához (adatok) (Neon Function). Nyilvános UCI adat, csak SELECT.
import { Hono } from "hono";
import { Pool } from "pg";
import { parseEnv } from "@neon/env";
import { attachDatabasePool } from "@neon/functions";
import config from "../neon";

const { postgres } = parseEnv(config, ["DATABASE_URL"]);
const pool = new Pool({ connectionString: postgres.databaseUrl, max: 5 });
attachDatabasePool(pool);

const app = new Hono();

app.get("/", (c) =>
  c.json({
    leiras: "Lengyel csődadatsor (UCI #365) – read-only API",
    vegpontok: ["/csodarany", "/kulcsmutatok", "/mutatok", "/mutato/:kod (pl. /mutato/x1; x37 nincs)"],
  }),
);

app.get("/csodarany", async (c) => c.json((await pool.query("SELECT * FROM v_csodarany")).rows));

app.get("/kulcsmutatok", async (c) =>
  c.json((await pool.query("SELECT * FROM v_kulcsmutatok_median")).rows),
);

app.get("/mutatok", async (c) =>
  c.json((await pool.query("SELECT * FROM mutato_szotar ORDER BY substr(mutato, 2)::int")).rows),
);

// Egy mutató mediánja horizontonként és státuszonként
app.get("/mutato/:kod", async (c) => {
  const kod = c.req.param("kod").toLowerCase();
  if (!/^x([1-9]|[1-5][0-9]|6[0-4])$/.test(kod) || kod === "x37")
    return c.json({ hiba: "ismeretlen mutató (x1..x64, az x37 kimaradt)" }, 400);
  const { rows } = await pool.query(
    `SELECT ev_a_csodig, csod, count(${kod}) AS n,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY ${kod}) AS median
     FROM adatok GROUP BY ev_a_csodig, csod ORDER BY ev_a_csodig, csod`,
  );
  const meta = await pool.query("SELECT leiras, csoport FROM mutato_szotar WHERE mutato = $1", [kod]);
  return c.json({ mutato: kod, ...meta.rows[0], adatok: rows });
});

export default app;
