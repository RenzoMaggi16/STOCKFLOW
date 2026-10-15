import {
  randomInt,
  randomUUID,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import bcrypt from "bcrypt";
import type { RowDataPacket, PoolConnection } from "mysql2/promise";
import { pool } from "../config/db";
import { env } from "../config/env";
import { HttpError } from "../utils/errors";
import { transaction } from "./inventory.service";
import { requireMail, sendCode } from "./mail.service";
export type CodeType = "email" | "reset" | "mfa" | "mfa_setup" | "mfa_disable";
const digest = (id: string, code: string) =>
  createHmac("sha256", env.JWT_REFRESH_SECRET)
    .update(`${id}:${code}`)
    .digest("hex");
export async function requestCode(
  email: string,
  type: CodeType,
  expectedUser?: number,
  expectedVersion?: number,
) {
  requireMail();
  const id = randomUUID();
  const code = String(randomInt(100000, 1000000));
  const user = await transaction(async (conn) => {
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT id,email,email_verificado,token_version FROM usuarios WHERE email=? AND activo=1 FOR UPDATE",
      [email],
    );
    const u = rows[0];
    if (
      !u ||
      (expectedUser && u.id !== expectedUser) ||
      (expectedVersion !== undefined && u.token_version !== expectedVersion)
    )
      return null;
    if (type === "email" && u.email_verificado) return null;
    const [recent] = await conn.execute<RowDataPacket[]>(
      "SELECT id FROM verificaciones WHERE usuario_id=? AND tipo=? AND creado_en>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 60 SECOND)",
      [u.id, type],
    );
    if (recent.length) return null; // Misma respuesta pública para evitar enumeración.
    await conn.execute(
      "UPDATE verificaciones SET utilizado_en=UTC_TIMESTAMP() WHERE usuario_id=? AND tipo=? AND utilizado_en IS NULL",
      [u.id, type],
    );
    await conn.execute(
      "INSERT INTO verificaciones(id,usuario_id,codigo_hash,tipo,expira_en,creado_en) VALUES(?,?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE),UTC_TIMESTAMP())",
      [id, u.id, digest(id, code), type],
    );
    return u;
  });
  if (user) {
    try {
      await sendCode(email, code, type);
    } catch (e) {
      await pool.execute(
        "UPDATE verificaciones SET utilizado_en=UTC_TIMESTAMP() WHERE id=?",
        [id],
      );
      throw e;
    }
  }
  return {
    challengeId: id,
    message:
      "Si la cuenta corresponde y no se envió un código recientemente, recibirás un correo. Esperá 60 segundos antes de reenviar.",
  };
}
export async function consume<T>(
  id: string,
  code: string,
  type: CodeType,
  work: (conn: PoolConnection, user: RowDataPacket) => Promise<T>,
  expectedUser?: number,
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Siempre bloquear usuario antes de códigos, igual que el envío.
    const [lookup] = await conn.execute<RowDataPacket[]>(
      "SELECT usuario_id FROM verificaciones WHERE id=?",
      [id],
    );
    const userId = lookup[0]?.usuario_id;
    if (!userId)
      throw new HttpError(401, "Código inválido o vencido", "INVALID_CODE");
    const [users] = await conn.execute<RowDataPacket[]>(
      "SELECT * FROM usuarios WHERE id=? FOR UPDATE",
      [userId],
    );
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT * FROM verificaciones WHERE id=? FOR UPDATE",
      [id],
    );
    const row = rows[0];
    const user = users[0];
    if (
      !user?.activo ||
      !row ||
      row.tipo !== type ||
      row.utilizado_en ||
      row.intentos >= 5 ||
      new Date(row.expira_en).getTime() <= Date.now() ||
      (expectedUser && userId !== expectedUser)
    )
      throw new HttpError(401, "Código inválido o vencido", "INVALID_CODE");
    if (
      !timingSafeEqual(
        Buffer.from(row.codigo_hash, "hex"),
        Buffer.from(digest(id, code), "hex"),
      )
    ) {
      await conn.execute(
        "UPDATE verificaciones SET intentos=intentos+1 WHERE id=?",
        [id],
      );
      await conn.commit();
      throw new HttpError(401, "Código inválido o vencido", "INVALID_CODE");
    }
    await conn.execute(
      "UPDATE verificaciones SET utilizado_en=UTC_TIMESTAMP() WHERE id=?",
      [id],
    );
    const result = await work(conn, user);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
export async function verifyEmail(id: string, code: string) {
  return consume(id, code, "email", async (conn, u) => {
    await conn.execute("UPDATE usuarios SET email_verificado=1 WHERE id=?", [
      u.id,
    ]);
    return { message: "Email verificado" };
  });
}
export async function resetPassword(
  id: string,
  code: string,
  password: string,
) {
  const hash = await bcrypt.hash(password, 12);
  return consume(id, code, "reset", async (conn, u) => {
    await conn.execute(
      "UPDATE usuarios SET password_hash=?,token_version=token_version+1 WHERE id=?",
      [hash, u.id],
    );
    await conn.execute(
      "UPDATE sesiones SET revocado_en=UTC_TIMESTAMP() WHERE usuario_id=?",
      [u.id],
    );
    await conn.execute(
      "UPDATE verificaciones SET utilizado_en=UTC_TIMESTAMP() WHERE usuario_id=? AND utilizado_en IS NULL",
      [u.id],
    );
    return { message: "Contraseña cambiada. Iniciá sesión nuevamente." };
  });
}
