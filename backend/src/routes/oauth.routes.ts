import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import * as oauth from "../services/oauth.service";
import { HttpError } from "../utils/errors";
const router = Router();
router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMIT", message: "Demasiados intentos" },
    },
  }),
);
router.get("/providers", (_req, res) =>
  res.json({ success: true, data: oauth.availability() }),
);
router.post("/:provider/start", async (req, res) => {
  const provider = oauth.providerSchema.parse(req.params.provider);
  const { challenge, platform } = z
    .object({ challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/), platform: z.enum(["web", "native"]).default("native") })
    .strict()
    .parse(req.body);
  res.json({ success: true, data: await oauth.start(provider, challenge, platform) });
});
router.get("/:provider/callback", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  let target: string | undefined;
  try {
    const provider = oauth.providerSchema.parse(req.params.provider);
    const callbackState = z.string().length(64).parse(req.query.state);
    target = await oauth.returnTarget(provider, callbackState);
    if (req.query.error)
      throw new HttpError(401, "Cancelado", "OAUTH_CANCELLED");
    const { state, code } = z
      .object({
        state: z.string().length(64),
        code: z.string().min(1).max(4096),
      })
      .parse(req.query);
    const ticket = await oauth.complete(provider, state, code);
    res.redirect(`${target}?ticket=${ticket}`);
  } catch (e) {
    const error = e instanceof HttpError ? e.code : "OAUTH_FAILED";
    if (target) res.redirect(`${target}?error=${encodeURIComponent(error)}`);
    else res.status(400).send("Solicitud de acceso inválida o vencida. Volvé a StockFlow e intentá nuevamente.");
  }
});
router.post("/exchange", async (req, res) => {
  const { ticket, verifier } = z
    .object({
      ticket: z.string().length(64),
      verifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
    })
    .strict()
    .parse(req.body);
  res.json({ success: true, data: await oauth.exchange(ticket, verifier) });
});
export default router;
