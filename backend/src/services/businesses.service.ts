import { randomBytes, randomUUID } from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/db";
import { transaction } from "./inventory.service";
import { lockAccess, type BusinessActor } from "./business-access";
import { hashToken } from "./tokens";
import { requireMail, sendInvitation } from "./mail.service";
import { HttpError } from "../utils/errors";
export type BusinessData = { nombre: string; rubro?: string | null; descripcion?: string | null };
export async function list(userId: number) {
  const [items] = await pool.execute<RowDataPacket[]>(
    "SELECT n.id,n.nombre,n.rubro,n.descripcion,n.activo,m.rol FROM negocios n JOIN negocio_usuarios m ON m.negocio_id=n.id WHERE m.usuario_id=? AND m.estado='activo' AND n.activo=1 ORDER BY n.nombre,n.id", [userId]);
  return { items };
}
export async function create(userId: number, data: BusinessData) {
  return transaction(async conn => {
    const [users] = await conn.execute<RowDataPacket[]>("SELECT activo,email_verificado FROM usuarios WHERE id=? FOR UPDATE", [userId]);
    if (!users[0]?.activo || !users[0]?.email_verificado) throw new HttpError(403, "Verificá tu correo", "EMAIL_NOT_VERIFIED");
    const [r] = await conn.execute<ResultSetHeader>("INSERT INTO negocios(nombre,rubro,descripcion,creado_por) VALUES(?,?,?,?)", [data.nombre, data.rubro ?? null, data.descripcion ?? null, userId]);
    await conn.execute("INSERT INTO negocio_usuarios(negocio_id,usuario_id,rol) VALUES(?,?,'admin')", [r.insertId, userId]);
    return { id: r.insertId, ...data, activo: true, rol: "admin" };
  });
}
export async function detail(actor: BusinessActor) {
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT n.id,n.nombre,n.rubro,n.descripcion,n.activo,m.rol FROM negocios n JOIN negocio_usuarios m ON m.negocio_id=n.id WHERE n.id=? AND n.activo=1 AND m.usuario_id=? AND m.estado='activo'", [actor.businessId, actor.userId]);
  if (!rows[0]) throw new HttpError(403, "Negocio no disponible", "BUSINESS_FORBIDDEN");
  return rows[0];
}
export async function edit(actor: BusinessActor, data: Partial<BusinessData> & { activo?: false }) {
  await transaction(async conn => {
    await lockAccess(conn, actor, ["admin"]);
    if (data.activo === false) {
      const [stock] = await conn.execute<RowDataPacket[]>("SELECT id FROM productos WHERE negocio_id=? AND stock<>0 LIMIT 1", [actor.businessId]);
      if (stock.length) throw new HttpError(409, "Dejá el stock en cero antes de desactivar el negocio", "NONZERO_STOCK");
      await conn.execute("UPDATE invitaciones SET estado='cancelada' WHERE negocio_id=? AND estado='pendiente'", [actor.businessId]);
    }
    // Lista fija de columnas, sin identificadores SQL enviados por el cliente.
    for (const key of ["nombre", "rubro", "descripcion", "activo"] as const)
      if (data[key] !== undefined) await conn.execute(`UPDATE negocios SET ${key}=? WHERE id=?`, [data[key], actor.businessId]);
  });
  return { message: data.activo === false ? "Negocio desactivado. Los datos se conservan." : "Negocio actualizado" };
}
export async function members(actor: BusinessActor) {
  const [items] = await pool.execute<RowDataPacket[]>("SELECT u.id,u.nombre,u.email,m.rol,m.estado,m.incorporado_en FROM negocio_usuarios m JOIN usuarios u ON u.id=m.usuario_id WHERE m.negocio_id=? ORDER BY m.estado,u.nombre", [actor.businessId]);
  return { items };
}
export async function changeMember(actor: BusinessActor, userId: number, value: { rol?: string; estado?: "activo" | "inactivo" }) {
  await transaction(async conn => {
    await lockAccess(conn, actor, ["admin"]);
    const [rows] = await conn.execute<RowDataPacket[]>("SELECT rol,estado FROM negocio_usuarios WHERE negocio_id=? AND usuario_id=? FOR UPDATE", [actor.businessId, userId]);
    const member = rows[0];
    if (!member) throw new HttpError(404, "Integrante no encontrado", "NOT_FOUND");
    if (member.rol === "admin" && member.estado === "activo" && (value.estado === "inactivo" || (value.rol && value.rol !== "admin"))) {
      const [admins] = await conn.execute<RowDataPacket[]>("SELECT m.id FROM negocio_usuarios m JOIN usuarios u ON u.id=m.usuario_id WHERE m.negocio_id=? AND m.rol='admin' AND m.estado='activo' AND u.activo=1 FOR UPDATE", [actor.businessId]);
      if (admins.length <= 1) throw new HttpError(409, "Debe quedar al menos un administrador activo en el negocio", "LAST_ADMIN");
    }
    await conn.execute("UPDATE negocio_usuarios SET rol=?,estado=? WHERE negocio_id=? AND usuario_id=?", [value.rol ?? member.rol, value.estado ?? member.estado, actor.businessId, userId]);
  });
  return { message: "Membresía actualizada" };
}
const invitationColumns = "i.id,i.negocio_id,i.email,i.rol,i.expira_en,i.enviado_en,i.creado_en,CASE WHEN i.estado='pendiente' AND i.expira_en<=UTC_TIMESTAMP() THEN 'vencida' ELSE i.estado END AS estado";
export async function invitations(actor: BusinessActor) {
  const [items] = await pool.execute<RowDataPacket[]>(`SELECT ${invitationColumns} FROM invitaciones i WHERE i.negocio_id=? ORDER BY i.creado_en DESC`, [actor.businessId]);
  return { items };
}
export async function inbox(userId: number) {
  const [items] = await pool.execute<RowDataPacket[]>(`SELECT ${invitationColumns},n.nombre AS negocio FROM invitaciones i JOIN negocios n ON n.id=i.negocio_id JOIN usuarios u ON u.email=i.email WHERE u.id=? AND u.email_verificado=1 AND n.activo=1 AND i.estado='pendiente' AND i.expira_en>UTC_TIMESTAMP() ORDER BY i.creado_en DESC`, [userId]);
  return { items };
}
export async function invite(actor: BusinessActor, email: string, rol: string) {
  requireMail();
  const token = randomBytes(32).toString("hex"), id = randomUUID();
  const name = await transaction(async conn => {
    await lockAccess(conn, actor, ["admin"]);
    const [existing] = await conn.execute<RowDataPacket[]>("SELECT m.id FROM negocio_usuarios m JOIN usuarios u ON u.id=m.usuario_id WHERE m.negocio_id=? AND u.email=? AND m.estado='activo'", [actor.businessId, email]);
    if (existing.length) throw new HttpError(409, "Ese correo ya integra el negocio", "ALREADY_MEMBER");
    const [pending] = await conn.execute<RowDataPacket[]>("SELECT id FROM invitaciones WHERE negocio_id=? AND email=? AND estado='pendiente' AND expira_en>UTC_TIMESTAMP()", [actor.businessId, email]);
    if (pending.length) throw new HttpError(409, "Ya hay una invitación pendiente. Podés reenviarla.", "INVITATION_PENDING");
    await conn.execute("UPDATE invitaciones SET estado='cancelada' WHERE negocio_id=? AND email=? AND estado='pendiente'", [actor.businessId, email]);
    await conn.execute("INSERT INTO invitaciones(id,negocio_id,email,rol,token_hash,expira_en,creado_por) VALUES(?,?,?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 7 DAY),?)", [id, actor.businessId, email, rol, hashToken(token), actor.userId]);
    const [business] = await conn.execute<RowDataPacket[]>("SELECT nombre FROM negocios WHERE id=?", [actor.businessId]);
    return String(business[0].nombre);
  });
  // Si SMTP falla, queda pendiente para reenviar, sin guardar el token en texto plano.
  await sendInvitation(email, name, rol, token);
  await pool.execute("UPDATE invitaciones SET enviado_en=UTC_TIMESTAMP() WHERE id=? AND token_hash=?", [id, hashToken(token)]);
  return { id, message: "Invitación enviada" };
}
export async function invitationBusiness(id: string) {
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT negocio_id FROM invitaciones WHERE id=?", [id]);
  if (!rows[0]) throw new HttpError(404, "Invitación no encontrada", "NOT_FOUND");
  return Number(rows[0].negocio_id);
}
export async function resend(actor: BusinessActor, id: string) {
  requireMail();
  const token = randomBytes(32).toString("hex");
  const invitation = await transaction(async conn => {
    await lockAccess(conn, actor, ["admin"]);
    const [rows] = await conn.execute<RowDataPacket[]>("SELECT i.*,n.nombre AS negocio FROM invitaciones i JOIN negocios n ON n.id=i.negocio_id WHERE i.id=? AND i.negocio_id=? FOR UPDATE", [id, actor.businessId]);
    const i = rows[0];
    if (!i || i.estado !== "pendiente") throw new HttpError(409, "La invitación ya no está pendiente", "INVITATION_UNAVAILABLE");
    if (i.enviado_en && new Date(i.enviado_en).getTime() > Date.now() - 60000) throw new HttpError(429, "Esperá un minuto antes de reenviar", "INVITATION_COOLDOWN");
    await conn.execute("UPDATE invitaciones SET token_hash=?,expira_en=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 7 DAY),enviado_en=UTC_TIMESTAMP() WHERE id=?", [hashToken(token), id]);
    return i;
  });
  await sendInvitation(invitation.email, invitation.negocio, invitation.rol, token);
  return { message: "Invitación reenviada. El enlace anterior dejó de ser válido." };
}
export async function cancel(actor: BusinessActor, id: string) {
  await transaction(async conn => {
    await lockAccess(conn, actor, ["admin"]);
    const [r] = await conn.execute<ResultSetHeader>("UPDATE invitaciones SET estado='cancelada' WHERE id=? AND negocio_id=? AND estado='pendiente'", [id, actor.businessId]);
    if (!r.affectedRows) throw new HttpError(409, "La invitación ya no está pendiente", "INVITATION_UNAVAILABLE");
  });
  return { message: "Invitación cancelada" };
}
export async function accept(userId: number, value: { token?: string; id?: string }) {
  const clause = value.token ? "token_hash=?" : "id=?";
  const key = value.token ? hashToken(value.token) : value.id!;
  const [found] = await pool.execute<RowDataPacket[]>(`SELECT negocio_id FROM invitaciones WHERE ${clause}`, [key]);
  if (!found[0]) throw new HttpError(404, "Invitación inválida", "INVITATION_UNAVAILABLE");
  const businessId = Number(found[0].negocio_id);
  return transaction(async conn => {
    const [business] = await conn.execute<RowDataPacket[]>("SELECT activo FROM negocios WHERE id=? FOR UPDATE", [businessId]);
    const [rows] = await conn.execute<RowDataPacket[]>(`SELECT *,expira_en>UTC_TIMESTAMP() AS vigente FROM invitaciones WHERE ${clause} AND negocio_id=? FOR UPDATE`, [key, businessId]);
    const i = rows[0];
    if (!business[0]?.activo || !i || Number(i.vigente) !== 1 || i.estado !== "pendiente") throw new HttpError(409, "Invitación vencida, cancelada o utilizada", "INVITATION_UNAVAILABLE");
    const [users] = await conn.execute<RowDataPacket[]>("SELECT email,email_verificado,activo FROM usuarios WHERE id=? FOR UPDATE", [userId]);
    const u = users[0];
    if (!u?.activo || !u.email_verificado || u.email.toLowerCase() !== i.email.toLowerCase()) throw new HttpError(403, "Ingresá con el correo invitado y verificalo para aceptar", "INVITATION_EMAIL_MISMATCH");
    const [members] = await conn.execute<RowDataPacket[]>("SELECT id,estado FROM negocio_usuarios WHERE negocio_id=? AND usuario_id=? FOR UPDATE", [businessId, userId]);
    if (members[0]?.estado === "activo") throw new HttpError(409, "Ya pertenecés a este negocio", "ALREADY_MEMBER");
    await conn.execute("INSERT INTO negocio_usuarios(negocio_id,usuario_id,rol) VALUES(?,?,?) ON DUPLICATE KEY UPDATE rol=VALUES(rol),estado='activo',incorporado_en=CURRENT_TIMESTAMP", [businessId, userId, i.rol]);
    await conn.execute("UPDATE invitaciones SET estado='aceptada',aceptado_por=? WHERE id=?", [userId, i.id]);
    return { negocio_id: businessId, message: "Ya sos parte del negocio" };
  });
}
