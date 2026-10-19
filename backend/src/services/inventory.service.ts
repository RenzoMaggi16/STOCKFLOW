import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db";
import { HttpError } from "../utils/errors";
import * as repo from "../repositories/inventory.repository";
import type { Movement } from "../validators/inventory";
import { lockAccess, type BusinessActor } from "./business-access";
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
  actor: BusinessActor,
  entity: repo.Entity,
  data: Record<string, string | number | null>,
  id?: number,
) {
  return transaction(async (conn) => {
    await lockAccess(conn, actor, ["admin", "encargado"]);
    if (id) await repo.getActive(conn, entity, id, actor.businessId);
    if (entity === "products") {
      if (data.categoria_id !== undefined)
        await repo.getActive(conn, "categories", Number(data.categoria_id), actor.businessId);
      if (data.proveedor_id != null)
        await repo.getActive(conn, "suppliers", Number(data.proveedor_id), actor.businessId);
    }
    if (id) await repo.update(conn, entity, id, data, actor.businessId);
    else {
      const { stock_inicial, ...values } = data;
      const initialStock = entity === "products" ? Number(stock_inicial ?? 0) : 0;
      id = await repo.insert(conn, entity, { ...values, ...(entity === "products" ? {stock:initialStock} : {}), negocio_id: actor.businessId });
      if (initialStock > 0) await conn.execute(
        "INSERT INTO movimientos_stock(producto_id,usuario_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo,negocio_id) VALUES(?,?,'entrada',?,0,?,'Existencias iniciales al crear el producto',?)",
        [id,actor.userId,initialStock,initialStock,actor.businessId],
      );
    }
    return repo.getActive(conn, entity, id, actor.businessId);
  });
}
export async function deactivate(actor: BusinessActor, entity: repo.Entity, id: number) {
  return transaction(async (conn) => {
    await lockAccess(conn, actor, ["admin"]);
    const row = await repo.getActive(conn, entity, id, actor.businessId);
    if (entity === "products" && row.stock !== 0)
      throw new HttpError(
        409,
        "Primero registrá la salida o ajuste del stock restante",
        "NONZERO_STOCK",
      );
    if (entity !== "products") {
      const column = entity === "categories" ? "categoria_id" : "proveedor_id";
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM productos WHERE ${column}=? AND negocio_id=? AND activo=1 LIMIT 1`,
        [id, actor.businessId],
      );
      if (rows.length)
        throw new HttpError(409, "Hay productos activos asociados", "IN_USE");
    }
    await repo.update(conn, entity, id, { activo: 0 }, actor.businessId);
  });
}
export async function list(
  businessId: number,
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
  const conditions = ["activo=1", "negocio_id=?"];
  const values: (string | number)[] = [businessId];
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
  actor: BusinessActor,
) {
  return transaction(async (conn) => {
    await lockAccess(conn, actor, data.tipo === "ajuste" ? ["admin", "encargado"] : undefined);
    // El candado se conserva hasta guardar tanto el stock como su auditoría.
    const product = await repo.getActive(conn, "products", data.producto_id, actor.businessId);
    const before = Number(product.stock);
    const after =
      data.tipo === "ajuste"
        ? data.cantidad
        : before + (data.tipo === "entrada" ? data.cantidad : -data.cantidad);
    if (after < 0)
      throw new HttpError(409, "Stock insuficiente", "INSUFFICIENT_STOCK");
    if (after > 2147483647)
      throw new HttpError(409, "Se supera el stock máximo", "STOCK_OVERFLOW");
    await conn.execute("UPDATE productos SET stock=? WHERE id=? AND negocio_id=?", [
      after,
      data.producto_id,
      actor.businessId,
    ]);
    await conn.execute(
      "INSERT INTO movimientos_stock(producto_id,usuario_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo,negocio_id) VALUES(?,?,?,?,?,?,?,?)",
      [
        data.producto_id,
        actor.userId,
        data.tipo,
        data.cantidad,
        before,
        after,
        data.motivo,
        actor.businessId,
      ],
    );
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT * FROM movimientos_stock WHERE id=LAST_INSERT_ID() AND negocio_id=?", [actor.businessId],
    );
    return rows[0];
  });
}
export async function movements(
  businessId: number,
  userId: number,
  role: string,
  page: number,
  limit: number,
) {
  const where = "WHERE m.negocio_id=?" + (role === "empleado" ? " AND m.usuario_id=?" : "");
  const args = role === "empleado" ? [businessId, userId] : [businessId];
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
