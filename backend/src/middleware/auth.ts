import type { RequestHandler } from "express";
import { pool } from "../config/db";
import type { RowDataPacket } from "mysql2";
import { HttpError } from "../utils/errors";
import { verifyAccess, accessVersion } from "../services/tokens";
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const match = /^Bearer (\S+)$/i.exec(req.header("authorization") || "");
    if (!match)
      throw new HttpError(401, "Se requiere Bearer token", "MISSING_TOKEN");
    const userId = verifyAccess(match[1]);
    const [rows] = await pool.execute<
      (RowDataPacket & {
        role: string;
        token_version: number;
        email_verificado: number;
      })[]
    >(
      "SELECT u.token_version,u.email_verificado,r.nombre AS role FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.id=? AND u.activo=1",
      [userId],
    );
    if (!rows[0]) throw new HttpError(401, "Usuario inactivo", "INVALID_USER");
    if (rows[0].token_version !== accessVersion(match[1]))
      throw new HttpError(401, "Sesión revocada", "INVALID_TOKEN");
    req.auth = { userId, role: rows[0].role };
    next();
  } catch (e) {
    next(e);
  }
};
export const authorize =
  (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth)
      return next(new HttpError(401, "No autenticado", "UNAUTHORIZED"));
    if (!roles.includes(req.auth.role))
      return next(new HttpError(403, "No tenés permisos", "FORBIDDEN"));
    next();
  };

export const verified: RequestHandler = async (req, _res, next) => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT email_verificado FROM usuarios WHERE id=?",
    [req.auth!.userId],
  );
  if (!rows[0]?.email_verificado)
    return next(
      new HttpError(
        403,
        "Verificá tu correo para continuar",
        "EMAIL_NOT_VERIFIED",
      ),
    );
  next();
};
