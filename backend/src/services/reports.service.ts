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


// Todos los agregados se calculan en SQL; el alcance personal no depende del frontend.
export async function dashboard(actor: import('./business-access').BusinessActor) {
  const personal = actor.role === 'repartidor' ? ' AND p.repartidor_id=?' : actor.role === 'empleado' ? ' AND p.creado_por=?' : '';
  const args = personal ? [actor.businessId,actor.userId] : [actor.businessId];
  const [counts] = await pool.execute<RowDataPacket[]>(`SELECT
    COUNT(*) AS pedidos_total,
    COALESCE(SUM(p.estado IN ('pendiente','en_preparacion','preparado','en_reparto','entrega_fallida')),0) AS pedidos_pendientes,
    COALESCE(SUM(p.estado IN ('preparado','en_reparto','entrega_fallida')),0) AS entregas_pendientes,
    COALESCE(SUM(p.estado='entregado'),0) AS pedidos_entregados,
    COALESCE(SUM(p.estado='entrega_fallida'),0) AS entregas_fallidas,
    COALESCE(SUM(p.estado IN ('pendiente','en_preparacion')),0) AS para_preparar,
    COALESCE(SUM(p.aviso_pago_en IS NOT NULL),0) AS pagos_informados
    FROM pedidos p WHERE p.negocio_id=? ${personal}`,args);
  const [latest] = await pool.execute<RowDataPacket[]>(`SELECT p.id,p.estado,p.total,c.nombre_comercial FROM pedidos p JOIN clientes c ON c.id=p.cliente_id AND c.negocio_id=p.negocio_id WHERE p.negocio_id=? ${personal} ORDER BY p.id DESC LIMIT 5`,args);
  if(actor.role==='repartidor') return {...counts[0],ultimos_pedidos:latest};
  const inventory = await summary(actor.businessId);
  const {valor,...basic}=inventory;
  const [top] = await pool.execute<RowDataPacket[]>(`SELECT pr.id,pr.nombre,SUM(d.cantidad) AS unidades FROM pedido_detalles d JOIN pedidos p ON p.id=d.pedido_id AND p.negocio_id=d.negocio_id JOIN productos pr ON pr.id=d.producto_id WHERE p.negocio_id=? AND p.estado='entregado' ${personal} GROUP BY pr.id,pr.nombre ORDER BY unidades DESC LIMIT 5`,args);
  const [clients] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS clientes FROM clientes WHERE negocio_id=? AND activo=1',[actor.businessId]);
  const common={...basic,...counts[0],...clients[0],ultimos_pedidos:latest,mas_distribuidos:top};
  if(actor.role==='empleado') return common;
  const low=await lowStock(actor.businessId,{},1,5);
  const [movements]=await pool.execute<RowDataPacket[]>('SELECT m.id,m.tipo,m.cantidad,m.creado_en,p.nombre FROM movimientos_stock m JOIN productos p ON p.id=m.producto_id WHERE m.negocio_id=? ORDER BY m.id DESC LIMIT 5',[actor.businessId]);
  const [adjustments]=await pool.execute<RowDataPacket[]>("SELECT COUNT(*) AS ajustes_pendientes FROM solicitudes_ajuste WHERE negocio_id=? AND estado='pendiente'",[actor.businessId]);
  const [team]=await pool.execute<RowDataPacket[]>("SELECT COUNT(*) AS empleados FROM negocio_usuarios WHERE negocio_id=? AND estado='activo'",[actor.businessId]);
  return {...common,valor,stock_bajo_productos:low.items,movimientos_recientes:movements,...adjustments[0],...team[0]};
}
