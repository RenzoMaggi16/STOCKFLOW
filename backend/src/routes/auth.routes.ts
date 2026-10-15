import { z } from "zod";
import * as codes from "../services/codes.service";
import * as users from "../services/users.service";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { registerSchema, loginSchema, refreshSchema } from "../validators/auth";
import * as auth from "../services/auth.service";
import { authenticate } from "../middleware/auth";
const router = Router();
const limit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT",
      message: "Demasiados intentos. Probá más tarde.",
    },
  },
});
router.post("/register", limit, async (req, res) => {
  const { nombre, email, password } = registerSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: await auth.register(nombre, email, password),
  });
});
router.post("/login", limit, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  res.json({ success: true, data: await auth.login(email, password) });
});
router.post("/refresh", limit, async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  res.json({ success: true, data: await auth.rotateRefresh(refreshToken) });
});
router.post("/logout", async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  await auth.logout(refreshToken);
  res.json({ success: true, message: "Sesión cerrada" });
});
router.get("/me", authenticate, async (req, res) => {
  res.json({ success: true, data: await auth.me(req.auth!.userId) });
});
router.patch("/me", authenticate, async (req, res) => {
  const { nombre } = z
    .object({ nombre: z.string().trim().min(2).max(100) })
    .strict()
    .parse(req.body);
  await users.edit(req.auth!.userId, nombre);
  res.json({ success: true, data: await auth.me(req.auth!.userId) });
});
const emailBody = z
  .object({ email: z.string().trim().toLowerCase().pipe(z.email().max(150)) })
  .strict();
const codeBody = z
  .object({ challengeId: z.uuid(), code: z.string().regex(/^\d{6}$/) })
  .strict();
for (const [route, type] of [
  ["resend-verification", "email"],
  ["forgot-password", "reset"],
] as const)
  router.post("/" + route, limit, async (req, res) => {
    const { email } = emailBody.parse(req.body);
    res.json({ success: true, data: await codes.requestCode(email, type) });
  });
router.post("/verify-email", limit, async (req, res) => {
  const v = codeBody.parse(req.body);
  res.json({
    success: true,
    data: await codes.verifyEmail(v.challengeId, v.code),
  });
});
router.post("/reset-password", limit, async (req, res) => {
  const v = codeBody
    .extend({ password: registerSchema.shape.password })
    .parse(req.body);
  res.json({
    success: true,
    data: await codes.resetPassword(v.challengeId, v.code, v.password),
  });
});
router.post("/mfa/verify", limit, async (req, res) => {
  const v = codeBody.parse(req.body);
  res.json({
    success: true,
    data: await codes.consume(v.challengeId, v.code, "mfa", (conn, u) =>
      auth.sessionForUser(conn, u.id),
    ),
  });
});
router.post("/mfa/request", limit, authenticate, async (req, res) => {
  const { enabled } = z
    .object({ enabled: z.boolean() })
    .strict()
    .parse(req.body);
  const u = await auth.me(req.auth!.userId);
  if (!u.email_verificado) {
    res.status(403).json({
      success: false,
      error: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Verificá tu email primero",
      },
    });
    return;
  }
  res.json({
    success: true,
    data: await codes.requestCode(
      u.email,
      enabled ? "mfa_setup" : "mfa_disable",
      u.id,
    ),
  });
});
router.post("/mfa/configure", limit, authenticate, async (req, res) => {
  const v = codeBody.extend({ enabled: z.boolean() }).parse(req.body);
  await codes.consume(
    v.challengeId,
    v.code,
    v.enabled ? "mfa_setup" : "mfa_disable",
    async (conn, u) => {
      await conn.execute(
        "UPDATE usuarios SET segundo_factor=?,token_version=token_version+1 WHERE id=?",
        [v.enabled, u.id],
      );
      await conn.execute(
        "UPDATE sesiones SET revocado_en=UTC_TIMESTAMP() WHERE usuario_id=?",
        [u.id],
      );
      await conn.execute(
        "UPDATE verificaciones SET utilizado_en=UTC_TIMESTAMP() WHERE usuario_id=? AND utilizado_en IS NULL",
        [u.id],
      );
    },
    req.auth!.userId,
  );
  res.json({
    success: true,
    data: { message: "Configuración actualizada. Iniciá sesión nuevamente." },
  });
});
export default router;
