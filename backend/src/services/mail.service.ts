import nodemailer from "nodemailer";
import { env } from "../config/env";
import { HttpError } from "../utils/errors";
export function requireMail() {
  if (!env.SMTP_HOST)
    throw new HttpError(
      503,
      "Falta configurar el servidor de correo",
      "MAIL_NOT_CONFIGURED",
    );
}
export async function sendCode(email: string, code: string, type: string) {
  return sendMail(email, "StockFlow: código de seguridad", `Tu código para ${type} es ${code}. Vence en 10 minutos. No lo compartas. Si no lo solicitaste, ignorá este mensaje.`);
}
export async function sendInvitation(email: string, business: string, role: string, token: string) {
  const link = `${env.WEB_APP_URL.replace(/\/$/, "")}/invite#token=${token}`;
  return sendMail(email, "StockFlow: invitación a un negocio", `Te invitaron a ${business} con el rol ${role}.\n\nAceptá la invitación: ${link}\n\nVence en 7 días. Iniciá sesión o registrate con ${email} y verificá ese correo para aceptar. Si no esperabas esta invitación, podés ignorarla.`);
}
async function sendMail(email: string, subject: string, text: string) {
  requireMail();
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    requireTLS: env.NODE_ENV === "production",
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10000,
    socketTimeout: 10000,
  });
  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject,
      text,
    });
  } catch {
    throw new HttpError(
      503,
      "No se pudo entregar el correo. Probá nuevamente más tarde.",
      "MAIL_UNAVAILABLE",
    );
  } finally {
    transport.close();
  }
}
