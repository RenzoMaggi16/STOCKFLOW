import bcrypt from "bcrypt";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { pool } from "../config/db";
import { HttpError } from "../utils/errors";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  refreshExpiry,
  verifyRefresh,
} from "./tokens";
import { requestCode } from "./codes.service";
type UserRow = RowDataPacket & {
  id: number;
  nombre: string;
  email: string;
  password_hash: string | null;
  rol_id: number;
  role: string;
  activo: number;
  email_verificado: number;
  segundo_factor: number;
  token_version: number;
};
export type PublicUser = {
  id: number;
  nombre: string;
  email: string;
  email_verificado: boolean;
  segundo_factor: boolean;
};
const publicUser = (u: UserRow): PublicUser => ({
  id: u.id,
  nombre: u.nombre,
  email: u.email,
  email_verificado: !!u.email_verificado,
  segundo_factor: !!u.segundo_factor,
});
const selectUser = `SELECT u.id,u.nombre,u.email,u.password_hash,u.rol_id,u.activo,u.email_verificado,u.segundo_factor,u.token_version,r.nombre AS role FROM usuarios u JOIN roles r ON r.id=u.rol_id`;
export async function issueSession(conn: PoolConnection, u: UserRow) {
  const accessToken = createAccessToken(u.id, u.token_version),
    refreshToken = createRefreshToken(u.id);
  await conn.execute(
    "INSERT INTO sesiones(usuario_id,refresh_token_hash,expira_en) VALUES(?,?,?)",
    [u.id, hashToken(refreshToken), refreshExpiry(refreshToken)],
  );
  return {
    user: publicUser(u),
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: 900,
  };
}
export async function register(
  nombre: string,
  email: string,
  password: string,
) {
  const passwordHash = await bcrypt.hash(password, 12);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [roles] = await conn.execute<RowDataPacket[]>(
      "SELECT id FROM roles WHERE nombre='empleado'",
    );
    if (!roles[0]) throw new Error("Falta el rol empleado en la base");
    const [r] = await conn.execute<ResultSetHeader>(
      "INSERT INTO usuarios(nombre,email,password_hash,rol_id) VALUES(?,?,?,?)",
      [nombre, email, passwordHash, roles[0].id],
    );
    const [rows] = await conn.execute<UserRow[]>(`${selectUser} WHERE u.id=?`, [
      r.insertId,
    ]);
    const session = await issueSession(conn, rows[0]);
    await conn.commit();
    return session;
  } catch (e: unknown) {
    await conn.rollback();
    if ((e as { code?: string }).code === "ER_DUP_ENTRY")
      throw new HttpError(409, "Este email ya está registrado", "EMAIL_EXISTS");
    throw e;
  } finally {
    conn.release();
  }
}
export async function login(email: string, password: string) {
  const [rows] = await pool.execute<UserRow[]>(
    `${selectUser} WHERE u.email=?`,
    [email],
  );
  const u = rows[0];
  // Hace un hash de comparación incluso si el usuario no existe.
  const fallback =
    "$2b$12$znygtzB0hVr1UXuFuu24buA33pj.qu5Dv76AgmcA0iH2vB.JAKEr2";
  const matched = await bcrypt.compare(password, u?.password_hash || fallback);
  if (!u || !matched || !u.activo)
    throw new HttpError(401, "Credenciales inválidas", "BAD_CREDENTIALS");
  return completeLogin(u.id, u.password_hash!);
}
// Se decide el segundo factor con el usuario bloqueado, no con la lectura
// anterior a bcrypt: la configuración puede cambiar mientras se compara.
async function completeLogin(id: number, expectedPasswordHash?: string) {
  const conn = await pool.getConnection();
  let challengeUser: UserRow | undefined;
  let session: Awaited<ReturnType<typeof issueSession>> | undefined;
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute<UserRow[]>(
      `${selectUser} WHERE u.id=? FOR UPDATE`,
      [id],
    );
    const user = rows[0];
    if (
      !user?.activo ||
      (expectedPasswordHash !== undefined &&
        user.password_hash !== expectedPasswordHash)
    )
      throw new HttpError(401, "Credenciales inválidas", "BAD_CREDENTIALS");
    if (user.segundo_factor) challengeUser = user;
    else session = await issueSession(conn, user);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  // No conservar una conexión ni un bloqueo SQL mientras se envía correo.
  if (challengeUser)
    return {
      requiresMfa: true,
      ...(await requestCode(
        challengeUser.email,
        "mfa",
        id,
        challengeUser.token_version,
      )),
    };
  return session!;
}
export async function me(userId: number): Promise<PublicUser> {
  const [rows] = await pool.execute<UserRow[]>(
    `${selectUser} WHERE u.id=? AND u.activo=1`,
    [userId],
  );
  if (!rows[0])
    throw new HttpError(401, "Usuario inactivo o inexistente", "INVALID_USER");
  return publicUser(rows[0]);
}
export async function rotateRefresh(token: string) {
  const userId = verifyRefresh(token),
    oldHash = hashToken(token);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Un único candado por cuenta evita carreras entre rotación y revocación.
    await conn.execute("SELECT id FROM usuarios WHERE id=? FOR UPDATE", [
      userId,
    ]);
    const [rows] = await conn.execute<
      (RowDataPacket & {
        id: number;
        revocado_en: Date | null;
        expira_en: Date;
      })[]
    >(
      "SELECT id,revocado_en,expira_en FROM sesiones WHERE usuario_id=? AND refresh_token_hash=? FOR UPDATE",
      [userId, oldHash],
    );
    const old = rows[0];
    if (
      !old ||
      old.revocado_en ||
      new Date(old.expira_en).getTime() <= Date.now()
    ) {
      // Si hay reutilización de un token revocado, cerrar las sesiones del usuario.
      if (old?.revocado_en)
        await conn.execute(
          "UPDATE sesiones SET revocado_en=UTC_TIMESTAMP() WHERE usuario_id=? AND revocado_en IS NULL",
          [userId],
        );
      await conn.commit();
      throw new HttpError(
        401,
        "Sesión inválida o ya renovada",
        "INVALID_SESSION",
      );
    }
    const [users] = await conn.execute<UserRow[]>(
      `${selectUser} WHERE u.id=? AND u.activo=1`,
      [userId],
    );
    if (!users[0]) throw new HttpError(401, "Usuario inactivo", "INVALID_USER");
    const refreshToken = createRefreshToken(userId);
    await conn.execute(
      "UPDATE sesiones SET revocado_en=UTC_TIMESTAMP() WHERE id=?",
      [old.id],
    );
    await conn.execute(
      "INSERT INTO sesiones(usuario_id,refresh_token_hash,expira_en) VALUES(?,?,?)",
      [userId, hashToken(refreshToken), refreshExpiry(refreshToken)],
    );
    await conn.commit();
    return {
      user: publicUser(users[0]),
      accessToken: createAccessToken(userId, users[0].token_version),
      refreshToken,
      tokenType: "Bearer",
      expiresIn: 900,
    };
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
}
export async function logout(token: string) {
  const userId = verifyRefresh(token);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("SELECT id FROM usuarios WHERE id=? FOR UPDATE", [
      userId,
    ]);
    await conn.execute(
      "UPDATE sesiones SET revocado_en=UTC_TIMESTAMP() WHERE usuario_id=? AND refresh_token_hash=? AND revocado_en IS NULL",
      [userId, hashToken(token)],
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function sessionForUser(conn: PoolConnection, id: number) {
  const [users] = await conn.execute<UserRow[]>(
    `${selectUser} WHERE u.id=? AND u.activo=1 FOR UPDATE`,
    [id],
  );
  if (!users[0]) throw new HttpError(401, "Cuenta inactiva", "INVALID_USER");
  return issueSession(conn, users[0]);
}
export async function socialSession(id: number) {
  return completeLogin(id);
}
