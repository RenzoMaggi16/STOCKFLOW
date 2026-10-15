import jwt, { type JwtPayload } from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";
import { env } from "../config/env";
import { HttpError } from "../utils/errors";
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function createAccessToken(userId: number, version = 0) {
  return jwt.sign({ role: "access", version }, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    subject: String(userId),
    issuer: "stockflow",
    audience: "stockflow-mobile",
    expiresIn: "15m",
  });
}
export function createRefreshToken(userId: number) {
  return jwt.sign({ kind: "refresh" }, env.JWT_REFRESH_SECRET, {
    algorithm: "HS256",
    subject: String(userId),
    issuer: "stockflow",
    audience: "stockflow-mobile",
    expiresIn: "7d",
    jwtid: randomUUID(),
  });
}
function verify(value: string, secret: string): JwtPayload {
  try {
    const payload = jwt.verify(value, secret, {
      algorithms: ["HS256"],
      issuer: "stockflow",
      audience: "stockflow-mobile",
    });
    if (
      typeof payload === "string" ||
      !payload.sub ||
      !/^\d+$/.test(payload.sub) ||
      !Number.isSafeInteger(Number(payload.sub)) ||
      Number(payload.sub) <= 0 ||
      !Number.isInteger(payload.exp)
    )
      throw new Error("JWT malformado");
    return payload;
  } catch {
    throw new HttpError(401, "Token inválido o vencido", "INVALID_TOKEN");
  }
}
export function verifyAccess(value: string): number {
  const p = verify(value, env.JWT_ACCESS_SECRET);
  if (p.role !== "access")
    throw new HttpError(401, "Token inválido", "INVALID_TOKEN");
  return Number(p.sub);
}
export function verifyRefresh(value: string): number {
  const p = verify(value, env.JWT_REFRESH_SECRET);
  if (p.kind !== "refresh" || !p.jti)
    throw new HttpError(401, "Token inválido", "INVALID_TOKEN");
  return Number(p.sub);
}
export function refreshExpiry(value: string): Date {
  const p = verify(value, env.JWT_REFRESH_SECRET);
  return new Date(Number(p.exp) * 1000);
}

export function accessVersion(value: string): number {
  return Number(verify(value, env.JWT_ACCESS_SECRET).version || 0);
}
