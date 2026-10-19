import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { env } from "../config/env";
import { pool } from "../config/db";
import { HttpError } from "../utils/errors";
import { hashToken } from "./tokens";
import { transaction } from "./inventory.service";
import { socialSession } from "./auth.service";
export const providerSchema = z.enum(["google", "github", "discord"]);
type Provider = z.infer<typeof providerSchema>;
function config(p: Provider) {
  const configs = {
    google: {
      id: env.GOOGLE_CLIENT_ID,
      secret: env.GOOGLE_CLIENT_SECRET,
      authorize: "https://accounts.google.com/o/oauth2/v2/auth",
      token: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
    },
    github: {
      id: env.GITHUB_CLIENT_ID,
      secret: env.GITHUB_CLIENT_SECRET,
      authorize: "https://github.com/login/oauth/authorize",
      token: "https://github.com/login/oauth/access_token",
      scope: "read:user user:email",
    },
    discord: {
      id: env.DISCORD_CLIENT_ID,
      secret: env.DISCORD_CLIENT_SECRET,
      authorize: "https://discord.com/oauth2/authorize",
      token: "https://discord.com/api/oauth2/token",
      scope: "identify email",
    },
  };
  return configs[p];
}
const callback = (p: Provider) =>
  `${env.PUBLIC_API_URL.replace(/\/$/, "")}/api/auth/social/${p}/callback`;
export const availability = () =>
  Object.fromEntries(
    providerSchema.options.map((p) => [
      p,
      !!config(p).id && !!config(p).secret,
    ]),
  );
export async function start(p: Provider, challenge: string, platform: "web" | "native" = "native") {
  const c = config(p);
  if (!c.id || !c.secret)
    throw new HttpError(
      503,
      "Este proveedor requiere configuración externa",
      "OAUTH_NOT_CONFIGURED",
    );
  const state = randomBytes(32).toString("hex");
  await pool.execute(
    "INSERT INTO oauth_flujos(state_hash,proveedor,challenge,expira_en,plataforma) VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE),?)",
    [hashToken(state), p, challenge, platform],
  );
  const url = new URL(c.authorize);
  url.search = new URLSearchParams({
    client_id: c.id,
    redirect_uri: callback(p),
    response_type: "code",
    scope: c.scope,
    state,
  }).toString();
  return { url: url.toString() };
}
async function json(url: string, init?: RequestInit): Promise<any> {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  if (!r.ok)
    throw new HttpError(
      401,
      "El proveedor rechazó la autenticación",
      "OAUTH_FAILED",
    );
  const data = await r.json();
  if (data.error)
    throw new HttpError(
      401,
      "El proveedor rechazó la autenticación",
      "OAUTH_FAILED",
    );
  return data;
}
export async function returnTarget(p: Provider, state: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT plataforma FROM oauth_flujos WHERE state_hash=? AND proveedor=? AND expira_en>UTC_TIMESTAMP()",
    [hashToken(state), p],
  );
  if (!rows[0]) throw new HttpError(401, "Solicitud social vencida", "INVALID_STATE");
  return rows[0].plataforma === "web"
    ? `${env.WEB_APP_URL.replace(/\/$/, "")}/oauth`
    : "stockflow://oauth";
}
export async function complete(p: Provider, state: string, code: string) {
  const c = config(p);
  const flow = await transaction(async (conn) => {
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT * FROM oauth_flujos WHERE state_hash=? FOR UPDATE",
      [hashToken(state)],
    );
    const row = rows[0];
    if (
      !row ||
      row.proveedor !== p ||
      row.usado ||
      row.ticket_hash ||
      new Date(row.expira_en).getTime() <= Date.now()
    )
      throw new HttpError(401, "Solicitud social vencida", "INVALID_STATE");
    await conn.execute("UPDATE oauth_flujos SET usado=1 WHERE state_hash=?", [
      hashToken(state),
    ]);
    return row;
  });
  const token = await json(c.token, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: c.id,
      client_secret: c.secret,
      redirect_uri: callback(p),
      code,
      grant_type: "authorization_code",
    }),
  });
  if (typeof token.access_token !== "string")
    throw new HttpError(401, "Token social inválido", "OAUTH_FAILED");
  const headers = {
    Authorization: `Bearer ${token.access_token}`,
    Accept: "application/json",
    "User-Agent": "StockFlow",
  };
  let sub: string,
    email: string,
    name: string,
    verified = false;
  if (p === "google") {
    const u = await json("https://openidconnect.googleapis.com/v1/userinfo", {
      headers,
    });
    sub = u.sub;
    email = u.email;
    name = u.name;
    verified = u.email_verified === true;
  } else if (p === "github") {
    const u = await json("https://api.github.com/user", { headers });
    const emails = await json("https://api.github.com/user/emails", {
      headers,
    });
    const chosen =
      emails.find((e: any) => e.primary && e.verified) ||
      emails.find((e: any) => e.verified);
    sub = String(u.id);
    email = chosen?.email;
    name = u.name || u.login;
    verified = !!chosen;
  } else {
    const u = await json("https://discord.com/api/v10/users/@me", { headers });
    sub = u.id;
    email = u.email;
    name = u.global_name || u.username;
    verified = u.verified === true;
  }
  sub = z.string().min(1).max(255).parse(sub);
  email = z.email().max(150).parse(email).toLowerCase();
  name = z
    .string()
    .min(1)
    .max(100)
    .parse(name || "Usuario");
  const ticket = randomBytes(32).toString("hex");
  await transaction(async (conn) => {
    const [linked] = await conn.execute<RowDataPacket[]>(
      "SELECT usuario_id FROM auth_proveedores WHERE proveedor=? AND proveedor_usuario_id=?",
      [p, sub],
    );
    let id = linked[0]?.usuario_id;
    if (!id) {
      const [existing] = await conn.execute<RowDataPacket[]>(
        "SELECT id FROM usuarios WHERE email=?",
        [email],
      );
      if (existing.length)
        throw new HttpError(
          409,
          "Este email ya tiene cuenta. Iniciá sesión con su método original; no se vinculan cuentas automáticamente.",
          "ACCOUNT_EXISTS",
        );
      const [created] = await conn.execute<ResultSetHeader>(
        "INSERT INTO usuarios(nombre,email,rol_id,email_verificado) VALUES(?,?,(SELECT id FROM roles WHERE nombre='empleado'),?)",
        [name, email, verified],
      );
      id = created.insertId;
      await conn.execute(
        "INSERT INTO auth_proveedores(usuario_id,proveedor,proveedor_usuario_id) VALUES(?,?,?)",
        [id, p, sub],
      );
    }
    await conn.execute(
      "UPDATE oauth_flujos SET ticket_hash=?,usuario_id=?,usado=0,expira_en=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 60 SECOND) WHERE state_hash=?",
      [hashToken(ticket), id, flow.state_hash],
    );
  });
  return ticket;
}
export async function exchange(ticket: string, verifier: string) {
  const id = await transaction(async (conn) => {
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT * FROM oauth_flujos WHERE ticket_hash=? FOR UPDATE",
      [hashToken(ticket)],
    );
    const row = rows[0];
    if (
      !row ||
      row.usado ||
      new Date(row.expira_en).getTime() <= Date.now() ||
      row.challenge !==
        createHash("sha256").update(verifier).digest("base64url")
    )
      throw new HttpError(401, "Retorno social inválido", "INVALID_TICKET");
    await conn.execute("UPDATE oauth_flujos SET usado=1 WHERE state_hash=?", [
      row.state_hash,
    ]);
    return Number(row.usuario_id);
  });
  return socialSession(id);
}
