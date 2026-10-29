// MySQL hace commit implícito del DDL: si una migración falla, revisar antes de reintentar.
require("dotenv/config");
const mysql = require("mysql2/promise");
const fs = require("node:fs/promises");
const path = require("node:path");
(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true" ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
      ...(process.env.DB_SSL_CA_FILE ? { ca: require("node:fs").readFileSync(process.env.DB_SSL_CA_FILE, "utf8") } : {}),
    } : undefined,
    multipleStatements: true,
  });
  try {
    const [[lock]] = await db.query(
      "SELECT GET_LOCK(CONCAT('stockflow:',DATABASE()),30) AS acquired",
    );
    if (lock.acquired !== 1)
      throw new Error("Otra migración está en ejecución");
    await db.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (nombre VARCHAR(255) PRIMARY KEY, aplicado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
    );
    const [rows] = await db.query("SELECT nombre FROM schema_migrations");
    for (const file of (
      await fs.readdir(path.join(__dirname, "../database/migrations"))
    )
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      if (rows.some((r) => r.nombre === file)) continue;
      await db.query(
        await fs.readFile(
          path.join(__dirname, "../database/migrations", file),
          "utf8",
        ),
      );
      await db.execute("INSERT INTO schema_migrations(nombre) VALUES(?)", [
        file,
      ]);
      console.log("Aplicada:", file);
    }
  } finally {
    await db.query("SELECT RELEASE_LOCK(CONCAT('stockflow:',DATABASE()))");
    await db.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
