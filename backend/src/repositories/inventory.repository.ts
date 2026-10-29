import type {
  PoolConnection,
  RowDataPacket,
  ResultSetHeader,
} from "mysql2/promise";
import { pool } from "../config/db";
import { HttpError } from "../utils/errors";
export type Entity = "categories" | "suppliers" | "products";
// Los identificadores SQL salen exclusivamente de esta lista interna.
export const tables = {
  categories: "categorias",
  suppliers: "proveedores",
  products: "productos",
} as const;
export async function getActive(
  conn: PoolConnection,
  entity: Entity,
  id: number,
  businessId: number,
) {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT * FROM ${tables[entity]} WHERE id=? AND negocio_id=? AND activo=1 FOR UPDATE`,
    [id, businessId],
  );
  if (!rows[0])
    throw new HttpError(404, "Registro inexistente o inactivo", "NOT_FOUND");
  return rows[0];
}
export async function insert(
  conn: PoolConnection,
  entity: Entity,
  data: Record<string, string | number | null>,
) {
  const keys = Object.keys(data);
  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO ${tables[entity]} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
    Object.values(data),
  );
  return result.insertId;
}
export async function update(
  conn: PoolConnection,
  entity: Entity,
  id: number,
  data: Record<string, string | number | null>,
  businessId: number,
) {
  const keys = Object.keys(data);
  await conn.execute(
    `UPDATE ${tables[entity]} SET ${keys.map((k) => `${k}=?`).join(",")} WHERE id=? AND negocio_id=?`,
    [...Object.values(data), id, businessId],
  );
}
export async function detail(entity: Entity, id: number, businessId: number) {
  const selection = entity === "products" ? "*, stock - (SELECT COALESCE(SUM(r.cantidad),0) FROM reservas_pedido r WHERE r.producto_id=productos.id AND r.negocio_id=productos.negocio_id AND r.estado='activa') AS stock_disponible" : "*";
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${selection} FROM ${tables[entity]} WHERE id=? AND negocio_id=? AND activo=1`,
    [id, businessId],
  );
  if (!rows[0])
    throw new HttpError(404, "Registro inexistente o inactivo", "NOT_FOUND");
  return rows[0];
}
