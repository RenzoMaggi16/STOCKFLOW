import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { HttpError } from "../utils/errors";
export type BusinessActor = { userId: number; businessId: number; role: string };
// Todos los cambios del negocio toman primero este candado. Serializa revocación,
// último administrador, invitaciones y escrituras de inventario del mismo negocio.
export async function lockAccess(conn: PoolConnection, actor: BusinessActor, roles = ["admin", "encargado", "empleado"]) {
  const [business] = await conn.execute<RowDataPacket[]>("SELECT activo FROM negocios WHERE id=? FOR UPDATE", [actor.businessId]);
  const [members] = await conn.execute<RowDataPacket[]>(
    "SELECT m.rol FROM negocio_usuarios m JOIN usuarios u ON u.id=m.usuario_id WHERE m.negocio_id=? AND m.usuario_id=? AND m.estado='activo' AND u.activo=1 AND u.email_verificado=1 FOR UPDATE",
    [actor.businessId, actor.userId],
  );
  if (!business[0]?.activo || !members[0] || !roles.includes(members[0].rol))
    throw new HttpError(403, "Tu acceso al negocio cambió. Volvé a seleccionar un negocio.", "BUSINESS_FORBIDDEN");
  return String(members[0].rol);
}
