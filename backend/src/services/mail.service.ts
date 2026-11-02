import nodemailer from "nodemailer";
import { env } from "../config/env";
import { HttpError } from "../utils/errors";
export function requireMail() {
  if (!env.BREVO_API_KEY && !env.SMTP_HOST)
    throw new HttpError(
      503,
      "Falta configurar el servidor de correo",
      "MAIL_NOT_CONFIGURED",
    );
}
export async function sendCode(email: string, code: string, type: string) {
  const isReset = type === "reset";
  const subject = isReset
    ? "StockFlow: restablecer contraseña"
    : type === "email"
      ? "StockFlow: verificar correo"
      : "StockFlow: código de seguridad";
  const action = isReset
    ? "restablecer tu contraseña"
    : type === "email"
      ? "verificar tu cuenta"
      : "iniciar sesión";
  return sendMail(
    email,
    subject,
    `Hola,\n\nTu código de seguridad para ${action} en StockFlow es:\n\n${code}\n\nEste código vence en 10 minutos. No lo compartas con nadie.\nSi no solicitaste este cambio, podés ignorar este correo tranquilamente.\n\nEl equipo de StockFlow`,
  );
}
export async function sendInvitation(email: string, business: string, role: string, token: string) {
  const link = `${env.WEB_APP_URL.replace(/\/$/, "")}/invite#token=${token}`;
  return sendMail(email, "StockFlow: invitación a un negocio", `Te invitaron a ${business} con el rol ${role}.\n\nAceptá la invitación: ${link}\n\nVence en 7 días. Iniciá sesión o registrate con ${email} y verificá ese correo para aceptar. Si no esperabas esta invitación, podés ignorarla.`);
}
async function sendMail(email: string, subject: string, text: string) {
  requireMail();
  // HTTPS funciona también en Render Free, donde SMTP está bloqueado.
  if (env.BREVO_API_KEY) {
    const from = /^(.*?)\s*<([^<>]+)>$/.exec(env.SMTP_FROM.trim());
    const sender = from
      ? { name: from[1].trim() || "StockFlow", email: from[2].trim() }
      : { name: "StockFlow", email: env.SMTP_FROM.trim() };
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender, to: [{ email }], subject, textContent: text }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        // No registrar destinatarios, códigos, credenciales ni respuestas del proveedor.
        console.warn("Brevo rechazó el envío de correo", { status: response.status });
        throw new Error("Mail provider rejected request");
      }
      return;
    } catch {
      throw new HttpError(503, "No se pudo entregar el correo. Probá nuevamente más tarde.", "MAIL_UNAVAILABLE");
    }
  }
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
