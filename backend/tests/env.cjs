// Configuración exclusivamente de pruebas, nunca usar estos secretos en producción.
Object.assign(process.env, {
  SMTP_HOST: "", SMTP_USER: "", SMTP_PASSWORD: "", SMTP_FROM: "StockFlow <test@example.com>",
  GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "",
  GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "",
  DISCORD_CLIENT_ID: "", DISCORD_CLIENT_SECRET: "",
  DB_SSL: "false", DB_SSL_CA_FILE: "",
  NODE_ENV: "test",
  DB_HOST: "127.0.0.1",
  DB_PORT: process.env.TEST_DB_PORT || "3307",
  DB_USER: process.env.TEST_DB_USER || "root",
  DB_PASSWORD: process.env.TEST_DB_PASSWORD || "",
  DB_NAME: "stockflow_test",
  JWT_ACCESS_SECRET: "test-access-".repeat(6),
  JWT_REFRESH_SECRET: "test-refresh-".repeat(6),
});
