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
    await lockAccess(conn, actor, entity === "products" && !id && Number(data.stock_inicial ?? 0) > 0 ? ["encargado"] : ["admin", "encargado"]);
    if (id) await repo.getActive(conn, entity, id, actor.businessId);
    if (entity === "products") {
      if (!id && data.categoria_id === undefined) {
        await conn.execute("INSERT INTO categorias(nombre,descripcion,negocio_id) VALUES('Cajas de cartón','Clasificación interna del catálogo',?) ON DUPLICATE KEY UPDATE id=id", [actor.businessId]);
        const [categories] = await conn.execute<RowDataPacket[]>("SELECT id FROM categorias WHERE nombre='Cajas de cartón' AND negocio_id=? AND activo=1", [actor.businessId]);
        if (!categories[0]) throw new HttpError(409,"La categoría interna está inactiva","INACTIVE_CATEGORY");
        data = { ...data, categoria_id: categories[0].id };
      }
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
    if (entity === "products") {
      const [reserved] = await conn.execute<RowDataPacket[]>("SELECT id FROM reservas_pedido WHERE negocio_id=? AND producto_id=? AND estado='activa' LIMIT 1", [actor.businessId,id]);
      if (reserved.length) throw new HttpError(409,"El producto tiene reservas activas","ACTIVE_RESERVATIONS");
    }
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
    search?: string;
    size?: string;
    type?: string;
    stock?: string;
    categoria_id?: number;
    proveedor_id?: number;
  },
) {
  const conditions = ["activo=1", "negocio_id=?"];
  const values: (string | number)[] = [businessId];
  const search = query.search ?? query.q;
  if (search) {
    conditions.push(
      entity === "products" ? "(nombre LIKE ? OR sku LIKE ?)" : "nombre LIKE ?",
    );
    values.push(`%${search}%`);
    if (entity === "products") values.push(`%${search}%`);
  }
  if (entity === "products")
    for (const field of ["categoria_id", "proveedor_id", "size", "type"] as const)
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
  const selection = entity === "products" ? "*, stock - (SELECT COALESCE(SUM(r.cantidad),0) FROM reservas_pedido r WHERE r.producto_id=productos.id AND r.negocio_id=productos.negocio_id AND r.estado='activa') AS stock_disponible" : "*";
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${selection} FROM ${repo.tables[entity]} WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
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
    await lockAccess(conn, actor, ["encargado"]);
    if (data.tipo === "salida") throw new HttpError(403,"Las salidas se registran al entregar pedidos","ORDER_DELIVERY_REQUIRED");
    // El candado se conserva hasta guardar tanto el stock como su auditoría.
    const product = await repo.getActive(conn, "products", data.producto_id, actor.businessId);
    const before = Number(product.stock);
    const [reserved] = await conn.execute<RowDataPacket[]>("SELECT COALESCE(SUM(cantidad),0) AS total FROM reservas_pedido WHERE negocio_id=? AND producto_id=? AND estado='activa'",[actor.businessId,data.producto_id]);
    const reservedStock = Number(reserved[0].total);
    const after =
      data.tipo === "ajuste"
        ? data.cantidad
        : before + (data.tipo === "entrada" ? data.cantidad : -data.cantidad);
    if (after < reservedStock)
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
