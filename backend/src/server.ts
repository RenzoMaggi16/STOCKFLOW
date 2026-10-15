import app from "./app";
import { pool } from "./config/db";
import { env } from "./config/env";
(async () => {
  try {
    await pool.query("SELECT 1");
    const server = app.listen(env.PORT, "0.0.0.0", () =>
      console.log(`StockFlow API en http://localhost:${env.PORT}`),
    );
    async function shutdown() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await pool.end();
    }
    process.once("SIGINT", () => {
      void shutdown();
    });
    process.once("SIGTERM", () => {
      void shutdown();
    });
  } catch (e) {
    console.error("No se pudo conectar a MySQL", e);
    process.exitCode = 1;
    await pool.end();
  }
})();
