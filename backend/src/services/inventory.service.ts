import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db";
import { HttpError } from "../utils/errors";
import * as repo from "../repositories/inventory.repository";
import type { Movement } from "../validators/inventory";
export async function transaction<T>(
  work: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
export async function save(
  entity: repo.Entity,
  data: Record<string, string | number | null>,
  id?: number,
) {
  return transaction(async (conn) => {
    if (id) await repo.getActive(conn, entity, id);
    if (entity === "products") {
      if (data.categoria_id !== undefined)
        await repo.getActive(conn, "categories", Number(data.categoria_id));
      if (data.proveedor_id != null)
        await repo.getActive(conn, "suppliers", Number(data.proveedor_id));
    }
    if (id) await repo.update(conn, entity, id, data);
    else id = await repo.insert(conn, entity, data);
    return repo.getActive(conn, entity, id);
  });
}
export async function deactivate(entity: repo.Entity, id: number) {
  return transaction(async (conn) => {
    const row = await repo.getActive(conn, entity, id);
    if (entity === "products" && row.stock !== 0)
      throw new HttpError(
        409,
        "Primero registrá la salida o ajuste del stock restante",
        "NONZERO_STOCK",
      );
    if (entity !== "products") {
      const column = entity === "categories" ? "categoria_id" : "proveedor_id";
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM productos WHERE ${column}=? AND activo=1 LIMIT 1`,
        [id],
      );
      if (rows.length)
        throw new HttpError(409, "Hay productos activos asociados", "IN_USE");
    }
    await repo.update(conn, entity, id, { activo: 0 });
  });
}
export async function list(
  entity: repo.Entity,
  query: {
    page: number;
    limit: number;
    q?: string;
    stock?: string;
    categoria_id?: number;
    proveedor_id?: number;
  },
) {
  const conditions = ["activo=1"];
  const values: (string | number)[] = [];
  if (query.q) {
    conditions.push(
      entity === "products" ? "(nombre LIKE ? OR sku LIKE ?)" : "nombre LIKE ?",
    );
    values.push(`%${query.q}%`);
    if (entity === "products") values.push(`%${query.q}%`);
  }
  if (entity === "products")
    for (const field of ["categoria_id", "proveedor_id"] as const)
      if (query[field]) {
        conditions.push(`${field}=?`);
        values.push(query[field]);
      }
  if (entity === "products" && query.stock)
    conditions.push(
      query.stock === "disponible"
        ? "stock>0"
        : query.stock === "sin"
          ? "stock=0"
          : "stock<=stock_minimo",
    );
  const where = conditions.join(" AND ");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM ${repo.tables[entity]} WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...values, query.limit, (query.page - 1) * query.limit],
  );
  const [count] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${repo.tables[entity]} WHERE ${where}`,
    values,
  );
  return {
    items: rows,
    page: query.page,
    limit: query.limit,
    total: Number(count[0].total),
  };
}
export async function recordMovement(
  data: Movement,
  userId: number,
  role: string,
) {
  if (data.tipo === "ajuste" && !["admin", "encargado"].includes(role))
    throw new HttpError(
      403,
      "Solo responsables pueden ajustar stock",
      "FORBIDDEN",
    );
  return transaction(async (conn) => {
    // El candado se conserva hasta guardar tanto el stock como su auditoría.
    const product = await repo.getActive(conn, "products", data.producto_id);
    const before = Number(product.stock);
    const after =
      data.tipo === "ajuste"
        ? data.cantidad
        : before + (data.tipo === "entrada" ? data.cantidad : -data.cantidad);
    if (after < 0)
      throw new HttpError(409, "Stock insuficiente", "INSUFFICIENT_STOCK");
    if (after > 2147483647)
      throw new HttpError(409, "Se supera el stock máximo", "STOCK_OVERFLOW");
    await conn.execute("UPDATE productos SET stock=? WHERE id=?", [
      after,
      data.producto_id,
    ]);
    await conn.execute(
      "INSERT INTO movimientos_stock(producto_id,usuario_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo) VALUES(?,?,?,?,?,?,?)",
      [
        data.producto_id,
        userId,
        data.tipo,
        data.cantidad,
        before,
        after,
        data.motivo,
      ],
    );
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT * FROM movimientos_stock WHERE id=LAST_INSERT_ID()",
    );
    return rows[0];
  });
}
export async function movements(
  userId: number,
  role: string,
  page: number,
  limit: number,
) {
  const where = role === "empleado" ? "WHERE m.usuario_id=?" : "";
  const args = role === "empleado" ? [userId] : [];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT m.*,p.nombre AS producto,u.nombre AS usuario FROM movimientos_stock m JOIN productos p ON p.id=m.producto_id JOIN usuarios u ON u.id=m.usuario_id ${where} ORDER BY m.id DESC LIMIT ? OFFSET ?`,
    [...args, limit, (page - 1) * limit],
  );
  const [count] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM movimientos_stock m ${where}`,
    args,
  );
  return { items: rows, page, limit, total: Number(count[0].total) };
}
