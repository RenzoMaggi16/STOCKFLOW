import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  SMTP_FROM: z.string().default("StockFlow <noreply@example.com>"),
  WEB_APP_URL: z.string().url().default("http://localhost:8081"),
  PUBLIC_API_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),
  DISCORD_CLIENT_ID: z.string().default(""),
  DISCORD_CLIENT_SECRET: z.string().default(""),
  DB_SSL: z.enum(["true", "false"]).default("false"),
  DB_SSL_CA_FILE: z.string().default(""),
  CORS_ORIGINS: z.string().default("http://localhost:8081"),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Configuración .env inválida:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}
export const env = parsed.data;
if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET)
  throw new Error("Los secretos JWT deben ser distintos");
