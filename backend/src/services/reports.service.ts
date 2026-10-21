import { HttpError } from "../utils/errors";
import { pool } from "../config/db";
import type { RowDataPacket } from "mysql2/promise";
export type Filters = {
  desde?: string;
  hasta?: string;
  categoria_id?: number;
  producto_id?: number;
};
function filter(businessId: number, f: Filters, movement = false) {
  const clauses = ["p.activo=1", "p.negocio_id=?"];
  const args: (string | number)[] = [businessId];
  if (f.categoria_id) {
    clauses.push("p.categoria_id=?");
    args.push(f.categoria_id);
  }
  if (f.producto_id) {
    clauses.push("p.id=?");
    args.push(f.producto_id);
  }
  if (movement && f.desde) {
    clauses.push("m.creado_en>=?");
    args.push(f.desde);
  }
  if (movement && f.hasta) {
    clauses.push("m.creado_en<DATE_ADD(?,INTERVAL 1 DAY)");
    args.push(f.hasta);
  }
  // El historial también incluye productos desactivados.
  if (movement) clauses[0] = "1=1";
  return { where: clauses.join(" AND "), args };
}
export async function summary(businessId: number, f: Filters = {}) {
  const { where, args } = filter(businessId, f);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS productos,COALESCE(SUM(p.stock),0) AS unidades,COALESCE(SUM(r.cantidad),0) AS unidades_reservadas,COALESCE(SUM(p.stock-COALESCE(r.cantidad,0)),0) AS unidades_disponibles,COALESCE(SUM(p.stock<=p.stock_minimo),0) AS stock_bajo,COALESCE(SUM(p.stock=0),0) AS sin_stock,COALESCE(SUM(p.precio*p.stock),0) AS valor FROM productos p LEFT JOIN (SELECT negocio_id,producto_id,SUM(cantidad) AS cantidad FROM reservas_pedido WHERE estado='activa' GROUP BY negocio_id,producto_id) r ON r.negocio_id=p.negocio_id AND r.producto_id=p.id WHERE ${where}`,
    args,
  );
  return rows[0];
}
export async function lowStock(businessId: number, f: Filters, page: number, limit: number) {
  const { where, args } = filter(businessId, f);
  const [items] = await pool.query(
    `SELECT p.* FROM productos p WHERE ${where} AND p.stock<=p.stock_minimo ORDER BY p.stock,p.id LIMIT ? OFFSET ?`,
    [...args, limit, (page - 1) * limit],
  );
  return { items, page, limit };
}
export async function movementReport(businessId: number, f: Filters) {
  const end = f.hasta ? new Date(f.hasta + "T00:00:00Z") : new Date();
  const start = f.desde
    ? new Date(f.desde + "T00:00:00Z")
    : new Date(end.getTime() - 29 * 86400000);
  if (end.getTime() - start.getTime() > 365 * 86400000)
    throw new HttpError(
      422,
      "El período máximo es de 366 días",
      "VALIDATION_ERROR",
    );
  f = {
    ...f,
    desde: start.toISOString().slice(0, 10),
    hasta: end.toISOString().slice(0, 10),
  };
  const { where, args } = filter(businessId, f, true);
  const [periodos] = await pool.execute(
    `SELECT DATE(m.creado_en) AS fecha,m.tipo,SUM(m.cantidad) AS cantidad,COUNT(*) AS operaciones FROM movimientos_stock m JOIN productos p ON p.id=m.producto_id WHERE ${where} GROUP BY DATE(m.creado_en),m.tipo ORDER BY fecha DESC LIMIT 1098`,
    args,
  );
  const [productos] = await pool.execute(
    `SELECT p.id,p.nombre,COUNT(*) AS operaciones,SUM(CASE WHEN m.tipo!='ajuste' THEN m.cantidad ELSE 0 END) AS unidades FROM movimientos_stock m JOIN productos p ON p.id=m.producto_id WHERE ${where} GROUP BY p.id,p.nombre ORDER BY operaciones DESC LIMIT 10`,
    args,
  );
  return { periodos, productos };
}
export async function categories(businessId: number, f: Filters) {
  const { where, args } = filter(businessId, f);
  const [rows] = await pool.execute(
    `SELECT c.id,c.nombre,COUNT(*) AS productos,SUM(p.stock) AS unidades,SUM(p.precio*p.stock) AS valor FROM productos p JOIN categorias c ON c.id=p.categoria_id WHERE ${where} GROUP BY c.id,c.nombre ORDER BY c.nombre`,
    args,
  );
  return rows;
}
