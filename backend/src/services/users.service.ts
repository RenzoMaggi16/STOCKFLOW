import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db";
import { transaction } from "./inventory.service";
import { HttpError } from "../utils/errors";
const select = `SELECT u.id,u.nombre,u.email,u.activo,u.email_verificado,u.segundo_factor,u.creado_en,r.nombre AS rol FROM usuarios u JOIN roles r ON r.id=u.rol_id`;
export async function detail(id: number) {
  const [rows] = await pool.execute<RowDataPacket[]>(`${select} WHERE u.id=?`, [
    id,
  ]);
  if (!rows[0]) throw new HttpError(404, "Usuario inexistente", "NOT_FOUND");
  return rows[0];
}
export async function list(
  q: string,
  rol: string | undefined,
  page: number,
  limit: number,
) {
  const where = ["(u.nombre LIKE ? OR u.email LIKE ?)"];
  const args: (string | number)[] = [`%${q}%`, `%${q}%`];
  if (rol) {
    where.push("r.nombre=?");
    args.push(rol);
  }
  const [items] = await pool.query(
    `${select} WHERE ${where.join(" AND ")} ORDER BY u.id DESC LIMIT ? OFFSET ?`,
    [...args, limit, (page - 1) * limit],
  );
  const [count] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE ${where.join(" AND ")}`,
    args,
  );
  return { items, total: Number(count[0].total), page, limit };
}
export async function edit(id: number, nombre: string) {
  await detail(id);
  await pool.execute("UPDATE usuarios SET nombre=? WHERE id=?", [nombre, id]);
  return detail(id);
}
export async function change(
  actor: number,
  id: number,
  value: { rol?: string; activo?: boolean },
) {
  await transaction(async (conn) => {
    // Un candado común evita que dos administradores eliminen el último acceso a la vez.
    await conn.execute("SELECT id FROM admin_lock WHERE id=1 FOR UPDATE");
    const [actors] = await conn.execute<RowDataPacket[]>(
      `${select} WHERE u.id=? FOR UPDATE`,
      [actor],
    );
    if (!actors[0]?.activo || actors[0].rol !== "admin")
      throw new HttpError(403, "Permiso administrativo revocado", "FORBIDDEN");
    const [rows] = await conn.execute<RowDataPacket[]>(
      `${select} WHERE u.id=? FOR UPDATE`,
      [id],
    );
    const user = rows[0];
    if (!user) throw new HttpError(404, "Usuario inexistente", "NOT_FOUND");
    const removes =
      value.activo === false ||
      (value.rol !== undefined && value.rol !== "admin");
    if (actor === id && removes)
      throw new HttpError(
        409,
        "No podés quitar tu propio acceso administrativo",
        "SELF_ADMIN_CHANGE",
      );
    if (user.rol === "admin" && user.activo && removes) {
      const [admins] = await conn.execute<RowDataPacket[]>(
        `${select} WHERE u.activo=1 AND r.nombre='admin' FOR UPDATE`,
      );
      if (admins.length <= 1)
        throw new HttpError(
          409,
          "Debe quedar un administrador activo",
          "LAST_ADMIN",
        );
    }
    if (value.rol)
      await conn.execute(
        "UPDATE usuarios SET rol_id=(SELECT id FROM roles WHERE nombre=?),token_version=token_version+1 WHERE id=?",
        [value.rol, id],
      );
    if (value.activo !== undefined)
      await conn.execute(
        "UPDATE usuarios SET activo=?,token_version=token_version+1 WHERE id=?",
        [value.activo, id],
      );
    await conn.execute(
      "UPDATE verificaciones SET utilizado_en=UTC_TIMESTAMP() WHERE usuario_id=? AND utilizado_en IS NULL",
      [id],
    );
    await conn.execute(
      "UPDATE sesiones SET revocado_en=UTC_TIMESTAMP() WHERE usuario_id=? AND revocado_en IS NULL",
      [id],
    );
  });
  return detail(id);
}
