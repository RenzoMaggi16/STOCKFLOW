import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db";
import { HttpError } from "../utils/errors";
import { lockAccess, type BusinessActor } from "./business-access";
import { transaction } from "./inventory.service";
import type { NewOrder } from "../validators/distributor";

const missing = () => new HttpError(404, "Registro inexistente en esta distribuidora", "NOT_FOUND");
const invalid = () => new HttpError(409, "El estado actual no permite esta acción", "INVALID_TRANSITION");
const cents = (price: string) => {
  const [whole, fraction = ""] = price.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
};
const money = (value: bigint) => `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
async function order(conn: PoolConnection, actor: BusinessActor, id: number) {
  const [rows] = await conn.execute<RowDataPacket[]>("SELECT * FROM pedidos WHERE id=? AND negocio_id=? FOR UPDATE", [id, actor.businessId]);
  if (!rows[0]) throw missing();
  return rows[0];
}
async function state(conn: PoolConnection, actor: BusinessActor, id: number, next: string, reason: string | null = null) {
  await conn.execute("UPDATE pedidos SET estado=? WHERE id=? AND negocio_id=?", [next, id, actor.businessId]);
  await conn.execute("INSERT INTO pedido_estados(negocio_id,pedido_id,estado,usuario_id,motivo) VALUES(?,?,?,?,?)", [actor.businessId,id,next,actor.userId,reason]);
}
async function release(conn: PoolConnection, actor: BusinessActor, id: number) {
  await conn.execute("UPDATE reservas_pedido SET estado='liberada' WHERE negocio_id=? AND pedido_id=? AND estado='activa'",[actor.businessId,id]);
}
export async function listClients(actor: BusinessActor) {
  const [rows] = await pool.execute<RowDataPacket[]>(`SELECT c.*,e.puntualidad,e.acuerdos,e.trato,e.motivo AS ultimo_motivo,
    CASE WHEN e.id IS NULL THEN NULL ELSE ROUND(e.puntualidad*0.5+e.acuerdos*0.3+e.trato*0.2,2) END AS puntuacion
    FROM clientes c LEFT JOIN evaluaciones_clientes e ON e.id=(SELECT MAX(x.id) FROM evaluaciones_clientes x WHERE x.negocio_id=c.negocio_id AND x.cliente_id=c.id)
    WHERE c.negocio_id=? ORDER BY c.activo DESC,puntuacion DESC,c.nombre_comercial`,[actor.businessId]);
  return rows;
}
export async function createClient(actor: BusinessActor, data: Record<string,string|number|boolean|null|undefined>) {
  return transaction(async conn => {
    await lockAccess(conn,actor,["empleado"]);
    validateCoordinates(data);
    const keys=Object.keys(data), values=Object.values(data).map(v=>v ?? null);
    const [result]=await conn.execute<ResultSetHeader>(`INSERT INTO clientes(negocio_id,${keys.join(",")}) VALUES(?,${keys.map(()=>"?").join(",")})`,[actor.businessId,...values]);
    const [rows]=await conn.execute<RowDataPacket[]>("SELECT * FROM clientes WHERE id=? AND negocio_id=?",[result.insertId,actor.businessId]);
    return rows[0];
  });
}
export async function editClient(actor: BusinessActor,id:number,data:Record<string,string|number|boolean|null|undefined>) {
  return transaction(async conn=>{
    await lockAccess(conn,actor,["admin","empleado"]);
    const [rows]=await conn.execute<RowDataPacket[]>("SELECT id FROM clientes WHERE id=? AND negocio_id=? FOR UPDATE",[id,actor.businessId]);
    if(!rows[0]) throw missing();
    validateCoordinates(data);
    if (("direccion_entrega" in data || "localidad" in data || "provincia" in data) && !("latitud" in data)) data={...data,latitud:null,longitud:null};
    const keys=Object.keys(data);
    await conn.execute(`UPDATE clientes SET ${keys.map(k=>`${k}=?`).join(",")} WHERE id=? AND negocio_id=?`,[...Object.values(data).map(v=>v??null),id,actor.businessId]);
    const [updated]=await conn.execute<RowDataPacket[]>("SELECT * FROM clientes WHERE id=? AND negocio_id=?",[id,actor.businessId]);
    return updated[0];
  });
}
export async function clientHistory(actor: BusinessActor,id:number) {
  const [clients]=await pool.execute<RowDataPacket[]>("SELECT id FROM clientes WHERE id=? AND negocio_id=?",[id,actor.businessId]);
  if(!clients[0]) throw missing();
  const [orders]=await pool.execute<RowDataPacket[]>("SELECT id,estado,total,creado_en FROM pedidos WHERE negocio_id=? AND cliente_id=? ORDER BY id DESC",[actor.businessId,id]);
  const [ratings]=await pool.execute<RowDataPacket[]>("SELECT e.*,u.nombre AS evaluador FROM evaluaciones_clientes e JOIN usuarios u ON u.id=e.evaluador_id WHERE e.negocio_id=? AND e.cliente_id=? ORDER BY e.id DESC",[actor.businessId,id]);
  return {orders,ratings};
}
export async function rateClient(actor:BusinessActor,id:number,data:{puntualidad:number;acuerdos:number;trato:number;motivo:string}) {
  return transaction(async conn=>{
    await lockAccess(conn,actor,["admin","encargado"]);
    const [clients]=await conn.execute<RowDataPacket[]>("SELECT id FROM clientes WHERE id=? AND negocio_id=? AND activo=1 FOR UPDATE",[id,actor.businessId]);
    if(!clients[0]) throw missing();
    const [result]=await conn.execute<ResultSetHeader>("INSERT INTO evaluaciones_clientes(negocio_id,cliente_id,evaluador_id,puntualidad,acuerdos,trato,motivo) VALUES(?,?,?,?,?,?,?)",[actor.businessId,id,actor.userId,data.puntualidad,data.acuerdos,data.trato,data.motivo]);
    return {id:result.insertId,puntuacion:Math.round((data.puntualidad*0.5+data.acuerdos*0.3+data.trato*0.2)*100)/100,...data};
  });
}
export async function createOrder(actor:BusinessActor,data:NewOrder) {
  return transaction(async conn=>{
    await lockAccess(conn,actor,["empleado"]);
    const [clients]=await conn.execute<RowDataPacket[]>("SELECT id FROM clientes WHERE id=? AND negocio_id=? AND activo=1 FOR UPDATE",[data.cliente_id,actor.businessId]);
    if(!clients[0]) throw missing();
    const items=[] as {producto_id:number;cantidad:number;precio_unitario:string;subtotal:string}[];
    let total=0n;
    for(const item of [...data.items].sort((a,b)=>a.producto_id-b.producto_id)) {
      const [products]=await conn.execute<RowDataPacket[]>("SELECT id,precio FROM productos WHERE id=? AND negocio_id=? AND activo=1 FOR UPDATE",[item.producto_id,actor.businessId]);
      if(!products[0]) throw missing();
      const price=String(products[0].precio), subtotal=cents(price)*BigInt(item.cantidad);
      total+=subtotal;
      items.push({...item,precio_unitario:price,subtotal:money(subtotal)});
    }
    if(total>99999999999999n) throw new HttpError(400,"Total demasiado alto","TOTAL_OVERFLOW");
    const [result]=await conn.execute<ResultSetHeader>("INSERT INTO pedidos(negocio_id,cliente_id,creado_por,total,observaciones) VALUES(?,?,?,?,?)",[actor.businessId,data.cliente_id,actor.userId,money(total),data.observaciones??null]);
    for(const item of items) await conn.execute("INSERT INTO pedido_detalles(negocio_id,pedido_id,producto_id,cantidad,precio_unitario,subtotal) VALUES(?,?,?,?,?,?)",[actor.businessId,result.insertId,item.producto_id,item.cantidad,item.precio_unitario,item.subtotal]);
    await conn.execute("INSERT INTO pedido_estados(negocio_id,pedido_id,estado,usuario_id) VALUES(?,?,'pendiente',?)",[actor.businessId,result.insertId,actor.userId]);
    return {id:result.insertId,estado:"pendiente",total:money(total),items};
  });
}
export async function listOrders(actor:BusinessActor) {
  const where=actor.role==="repartidor"?"AND p.repartidor_id=?":"";
  const params=actor.role==="repartidor"?[actor.businessId,actor.userId]:[actor.businessId];
  const [rows]=await pool.execute<RowDataPacket[]>(`SELECT p.*,c.nombre_comercial,c.direccion_entrega,c.localidad,c.provincia,c.latitud,c.longitud,u.nombre AS vendedor FROM pedidos p JOIN clientes c ON c.id=p.cliente_id JOIN usuarios u ON u.id=p.creado_por WHERE p.negocio_id=? ${where} ORDER BY p.id DESC LIMIT 200`,params);
  return rows;
}
export async function listDrivers(actor:BusinessActor) {
  const [rows]=await pool.execute<RowDataPacket[]>("SELECT u.id,u.nombre FROM negocio_usuarios m JOIN usuarios u ON u.id=m.usuario_id WHERE m.negocio_id=? AND m.rol='repartidor' AND m.estado='activo' AND u.activo=1 ORDER BY u.nombre",[actor.businessId]);
  return rows;
}
export async function orderDetail(actor:BusinessActor,id:number) {
  const [rows]=await pool.execute<RowDataPacket[]>("SELECT p.*,c.nombre_comercial,c.direccion_entrega,c.localidad,c.provincia,c.latitud,c.longitud,c.telefono FROM pedidos p JOIN clientes c ON c.id=p.cliente_id WHERE p.id=? AND p.negocio_id=?",[id,actor.businessId]);
  const item=rows[0];
  if(!item || (actor.role==="repartidor" && Number(item.repartidor_id)!==actor.userId)) throw missing();
  const [details]=await pool.execute<RowDataPacket[]>("SELECT d.*,pr.nombre FROM pedido_detalles d JOIN productos pr ON pr.id=d.producto_id WHERE d.negocio_id=? AND d.pedido_id=?",[actor.businessId,id]);
  const [reservations]=await pool.execute<RowDataPacket[]>("SELECT producto_id,cantidad,estado,creado_en FROM reservas_pedido WHERE negocio_id=? AND pedido_id=? ORDER BY producto_id",[actor.businessId,id]);
  const [history]=await pool.execute<RowDataPacket[]>("SELECT h.*,u.nombre AS usuario FROM pedido_estados h JOIN usuarios u ON u.id=h.usuario_id WHERE h.negocio_id=? AND h.pedido_id=? ORDER BY h.id",[actor.businessId,id]);
  return {...item,items:details,reservas:reservations,historial:history};
}
export async function prepare(actor:BusinessActor,id:number,decision:"approve"|"ready"|"reject",reason?:string) {
  return transaction(async conn=>{
    await lockAccess(conn,actor,["encargado"]);
    const item=await order(conn,actor,id);
    if(decision==="approve") {
      if(item.estado!=="pendiente") throw invalid();
      const [details]=await conn.execute<RowDataPacket[]>("SELECT producto_id,cantidad FROM pedido_detalles WHERE negocio_id=? AND pedido_id=? ORDER BY producto_id",[actor.businessId,id]);
      for(const detail of details) {
        const [products]=await conn.execute<RowDataPacket[]>("SELECT stock FROM productos WHERE negocio_id=? AND id=? AND activo=1 FOR UPDATE",[actor.businessId,detail.producto_id]);
        if(!products[0]) throw missing();
        const [reserved]=await conn.execute<RowDataPacket[]>("SELECT COALESCE(SUM(cantidad),0) AS total FROM reservas_pedido WHERE negocio_id=? AND producto_id=? AND estado='activa'",[actor.businessId,detail.producto_id]);
        if(Number(products[0].stock)-Number(reserved[0].total)<Number(detail.cantidad)) throw new HttpError(409,"Stock disponible insuficiente para reservar","INSUFFICIENT_STOCK");
        await conn.execute("INSERT INTO reservas_pedido(negocio_id,pedido_id,producto_id,cantidad) VALUES(?,?,?,?)",[actor.businessId,id,detail.producto_id,detail.cantidad]);
      }
      await state(conn,actor,id,"en_preparacion");
    } else if(decision==="ready") {
      if(item.estado!=="en_preparacion") throw invalid();
      await state(conn,actor,id,"preparado");
    } else {
      if(!["pendiente","en_preparacion"].includes(item.estado)) throw invalid();
      await release(conn,actor,id);
      await state(conn,actor,id,"cancelado",reason!);
    }
    return {id,estado:decision==="approve"?"en_preparacion":decision==="ready"?"preparado":"cancelado"};
  });
}
export async function assign(actor:BusinessActor,id:number,driverId:number) {
  return transaction(async conn=>{
    await lockAccess(conn,actor,["admin","encargado"]);
    const item=await order(conn,actor,id);
    if(!["preparado","entrega_fallida"].includes(item.estado)) throw invalid();
    const [drivers]=await conn.execute<RowDataPacket[]>("SELECT id FROM negocio_usuarios WHERE negocio_id=? AND usuario_id=? AND rol='repartidor' AND estado='activo' FOR UPDATE",[actor.businessId,driverId]);
    if(!drivers[0]) throw new HttpError(400,"Seleccioná un repartidor activo de esta distribuidora","INVALID_DRIVER");
    await conn.execute("UPDATE pedidos SET repartidor_id=? WHERE id=? AND negocio_id=?",[driverId,id,actor.businessId]);
    await state(conn,actor,id,"preparado",`Asignado al repartidor ${driverId}`);
    return {id,estado:"preparado",repartidor_id:driverId};
  });
}
export async function delivery(actor:BusinessActor,id:number,decision:"pickup"|"delivered"|"failed",reason?:string) {
  return transaction(async conn=>{
    await lockAccess(conn,actor,["repartidor"]);
    const item=await order(conn,actor,id);
    if(Number(item.repartidor_id)!==actor.userId) throw missing();
    if(decision==="pickup") {
      if(item.estado!=="preparado") throw invalid();
      await state(conn,actor,id,"en_reparto");
    } else if(decision==="failed") {
      if(item.estado!=="en_reparto") throw invalid();
      await state(conn,actor,id,"entrega_fallida",reason!);
    } else {
      if(item.estado!=="en_reparto") throw invalid();
      const [reserves]=await conn.execute<RowDataPacket[]>("SELECT producto_id,cantidad FROM reservas_pedido WHERE negocio_id=? AND pedido_id=? AND estado='activa' ORDER BY producto_id FOR UPDATE",[actor.businessId,id]);
      const [details]=await conn.execute<RowDataPacket[]>("SELECT producto_id FROM pedido_detalles WHERE negocio_id=? AND pedido_id=?",[actor.businessId,id]);
      if(reserves.length!==details.length) throw new HttpError(409,"El pedido no tiene todas sus reservas","MISSING_RESERVATION");
      for(const reserve of reserves) {
        const [products]=await conn.execute<RowDataPacket[]>("SELECT stock FROM productos WHERE negocio_id=? AND id=? FOR UPDATE",[actor.businessId,reserve.producto_id]);
        const before=Number(products[0]?.stock), after=before-Number(reserve.cantidad);
        if(!Number.isSafeInteger(after)||after<0) throw new HttpError(409,"Stock insuficiente","INSUFFICIENT_STOCK");
        await conn.execute("UPDATE productos SET stock=? WHERE negocio_id=? AND id=?",[after,actor.businessId,reserve.producto_id]);
        await conn.execute("INSERT INTO movimientos_stock(negocio_id,pedido_id,producto_id,usuario_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo) VALUES(?,?,?,?,'salida',?,?,?,'Entrega de pedido')",[actor.businessId,id,reserve.producto_id,actor.userId,reserve.cantidad,before,after]);
      }
      await conn.execute("UPDATE reservas_pedido SET estado='consumida' WHERE negocio_id=? AND pedido_id=? AND estado='activa'",[actor.businessId,id]);
      await state(conn,actor,id,"entregado");
    }
    return {id,estado:decision==="pickup"?"en_reparto":decision==="failed"?"entrega_fallida":"entregado"};
  });
}
export async function cancel(actor:BusinessActor,id:number,reason:string) {
  return transaction(async conn=>{
    await lockAccess(conn,actor,["admin","empleado"]);
    const item=await order(conn,actor,id);
    if(actor.role==="empleado" && Number(item.creado_por)!==actor.userId) throw missing();
    if(!["pendiente","en_preparacion","preparado","entrega_fallida"].includes(item.estado)) throw invalid();
    await release(conn,actor,id);
    await state(conn,actor,id,"cancelado",reason);
    return {id,estado:"cancelado"};
  });
}
export async function returnOrder(actor:BusinessActor,id:number,reason:string) {
  return transaction(async conn=>{
    await lockAccess(conn,actor,["admin","encargado"]);
    const item=await order(conn,actor,id);
    if(item.estado!=="entregado") throw invalid();
    const [details]=await conn.execute<RowDataPacket[]>("SELECT producto_id,cantidad FROM pedido_detalles WHERE negocio_id=? AND pedido_id=? ORDER BY producto_id",[actor.businessId,id]);
    for(const detail of details) {
      const [products]=await conn.execute<RowDataPacket[]>("SELECT stock FROM productos WHERE negocio_id=? AND id=? FOR UPDATE",[actor.businessId,detail.producto_id]);
      const before=Number(products[0].stock),after=before+Number(detail.cantidad);
      if(after>2147483647) throw new HttpError(409,"Se supera el stock máximo","STOCK_OVERFLOW");
      await conn.execute("UPDATE productos SET stock=? WHERE negocio_id=? AND id=?",[after,actor.businessId,detail.producto_id]);
      await conn.execute("INSERT INTO movimientos_stock(negocio_id,pedido_id,producto_id,usuario_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo) VALUES(?,?,?,?,'entrada',?,?,?,?)",[actor.businessId,id,detail.producto_id,actor.userId,detail.cantidad,before,after,`Devolución: ${reason}`]);
    }
    await state(conn,actor,id,"devuelto",reason);
    return {id,estado:"devuelto"};
  });
}
export async function paymentNotice(actor:BusinessActor,id:number) {
  return transaction(async conn=>{
    await lockAccess(conn,actor,["empleado"]);
    const item=await order(conn,actor,id);
    if(item.estado==="cancelado"||item.estado==="devuelto") throw invalid();
    await conn.execute("UPDATE pedidos SET aviso_pago_en=UTC_TIMESTAMP(),aviso_pago_por=? WHERE negocio_id=? AND id=?",[actor.userId,actor.businessId,id]);
    return {id,aviso_pago:true,pago_verificado:false};
  });
}
export async function requestAdjustment(actor:BusinessActor,data:{producto_id:number;stock_propuesto:number;motivo:string}) {
  return transaction(async conn=>{
    await lockAccess(conn,actor,["encargado","empleado"]);
    const [products]=await conn.execute<RowDataPacket[]>("SELECT id FROM productos WHERE negocio_id=? AND id=? AND activo=1 FOR UPDATE",[actor.businessId,data.producto_id]);
    if(!products[0]) throw missing();
    const [result]=await conn.execute<ResultSetHeader>("INSERT INTO solicitudes_ajuste(negocio_id,producto_id,solicitado_por,stock_propuesto,motivo) VALUES(?,?,?,?,?)",[actor.businessId,data.producto_id,actor.userId,data.stock_propuesto,data.motivo]);
    return {id:result.insertId,estado:"pendiente"};
  });
}
export async function listAdjustments(actor:BusinessActor) {
  const [rows]=await pool.execute<RowDataPacket[]>("SELECT s.*,p.nombre AS producto,u.nombre AS solicitante FROM solicitudes_ajuste s JOIN productos p ON p.id=s.producto_id JOIN usuarios u ON u.id=s.solicitado_por WHERE s.negocio_id=? ORDER BY s.id DESC",[actor.businessId]);
  return rows;
}
export async function reviewAdjustment(actor:BusinessActor,id:number,approve:boolean,reason:string) {
  return transaction(async conn=>{
    await lockAccess(conn,actor,["admin"]);
    const [rows]=await conn.execute<RowDataPacket[]>("SELECT * FROM solicitudes_ajuste WHERE negocio_id=? AND id=? FOR UPDATE",[actor.businessId,id]);
    const request=rows[0];
    if(!request) throw missing();
    if(request.estado!=="pendiente") throw invalid();
    if(approve) {
      const [products]=await conn.execute<RowDataPacket[]>("SELECT stock FROM productos WHERE negocio_id=? AND id=? AND activo=1 FOR UPDATE",[actor.businessId,request.producto_id]);
      if(!products[0]) throw missing();
      const [reserved]=await conn.execute<RowDataPacket[]>("SELECT COALESCE(SUM(cantidad),0) AS total FROM reservas_pedido WHERE negocio_id=? AND producto_id=? AND estado='activa'",[actor.businessId,request.producto_id]);
      const before=Number(products[0].stock),after=Number(request.stock_propuesto);
      if(after<Number(reserved[0].total)) throw new HttpError(409,"El ajuste afectaría reservas activas","ACTIVE_RESERVATIONS");
      await conn.execute("UPDATE productos SET stock=? WHERE negocio_id=? AND id=?",[after,actor.businessId,request.producto_id]);
      await conn.execute("INSERT INTO movimientos_stock(negocio_id,producto_id,usuario_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo) VALUES(?,?,?,'ajuste',?,?,?,?)",[actor.businessId,request.producto_id,actor.userId,after,before,after,`Ajuste extraordinario #${id}: ${request.motivo}. ${reason}`]);
    }
    await conn.execute("UPDATE solicitudes_ajuste SET estado=?,revisado_por=?,revisado_en=UTC_TIMESTAMP(),motivo_revision=? WHERE negocio_id=? AND id=?",[approve?"aprobada":"rechazada",actor.userId,reason,actor.businessId,id]);
    return {id,estado:approve?"aprobada":"rechazada"};
  });
}

function validateCoordinates(data: Record<string,unknown>) {
  if ((data.latitud != null) !== (data.longitud != null) || ('latitud' in data) !== ('longitud' in data))
    throw new HttpError(422,'Indicá latitud y longitud juntas','VALIDATION_ERROR');
}
