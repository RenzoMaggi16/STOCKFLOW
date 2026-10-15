// Configuración exclusivamente de pruebas, nunca usar estos secretos en producción.
Object.assign(process.env, {
  NODE_ENV: "test",
  DB_HOST: "127.0.0.1",
  DB_PORT: process.env.TEST_DB_PORT || "3307",
  DB_USER: process.env.TEST_DB_USER || "root",
  DB_PASSWORD: process.env.TEST_DB_PASSWORD || "",
  DB_NAME: "stockflow_test",
  JWT_ACCESS_SECRET: "test-access-".repeat(6),
  JWT_REFRESH_SECRET: "test-refresh-".repeat(6),
});
