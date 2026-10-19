import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";
import { env } from "./env";
export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: env.DB_SSL === "true" ? {
    rejectUnauthorized: true,
    ...(env.DB_SSL_CA_FILE ? { ca: readFileSync(env.DB_SSL_CA_FILE, "utf8") } : {}),
  } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: false,
  timezone: "Z",
  supportBigNumbers: true,
  bigNumberStrings: true,
});

// timezone configura el driver; la sesión SQL también debe trabajar en UTC.
pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'");
});
