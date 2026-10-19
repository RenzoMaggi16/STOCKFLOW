import { Router } from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { businessContext, authorize } from "../middleware/auth";
import { idSchema } from "../validators/inventory";
import * as service from "../services/businesses.service";
const router = Router();
const role = z.enum(["admin", "encargado", "empleado"]);
const data = z.object({ nombre: z.string().trim().min(2).max(100), rubro: z.string().trim().max(100).nullable().optional(), descripcion: z.string().trim().max(1000).nullable().optional() }).strict();
const mailLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: "draft-8", legacyHeaders: false });
router.get("/businesses", async (req,res) => res.json({ success: true, data: await service.list(req.auth!.userId) }));
router.post("/businesses", async (req,res) => res.status(201).json({ success: true, data: await service.create(req.auth!.userId, data.parse(req.body)) }));
router.get("/businesses/:id", businessContext, async (req,res) => res.json({ success: true, data: await service.detail(req.auth!) }));
router.patch("/businesses/:id", businessContext, authorize("admin"), async (req,res) => res.json({ success: true, data: await service.edit(req.auth!, data.partial().extend({ activo: z.literal(false).optional() }).refine(v => Object.keys(v).length > 0).parse(req.body)) }));
router.get("/businesses/:id/members", businessContext, authorize("admin"), async (req,res) => res.json({ success: true, data: await service.members(req.auth!) }));
router.patch("/businesses/:id/members/:userId", businessContext, authorize("admin"), async (req,res) => res.json({ success: true, data: await service.changeMember(req.auth!, idSchema.parse(req.params.userId), z.object({ rol: role.optional(), estado: z.enum(["activo","inactivo"]).optional() }).strict().refine(v => Object.keys(v).length > 0).parse(req.body)) }));
router.delete("/businesses/:id/members/:userId", businessContext, authorize("admin"), async (req,res) => res.json({ success: true, data: await service.changeMember(req.auth!, idSchema.parse(req.params.userId), { estado: "inactivo" }) }));
router.get("/businesses/:id/invitations", businessContext, authorize("admin"), async (req,res) => res.json({ success: true, data: await service.invitations(req.auth!) }));
router.post("/businesses/:id/invitations", businessContext, authorize("admin"), mailLimit, async (req,res) => {
  const v = z.object({ email: z.string().trim().toLowerCase().pipe(z.email().max(150)), rol: role }).strict().parse(req.body);
  res.status(201).json({ success: true, data: await service.invite(req.auth!, v.email, v.rol) });
});
router.get("/invitations", async (req,res) => res.json({ success: true, data: await service.inbox(req.auth!.userId) }));
router.post("/invitations/accept", async (req,res) => {
  const v = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/).optional(), id: z.uuid().optional() }).strict().refine(v => !!v.token !== !!v.id).parse(req.body);
  res.json({ success: true, data: await service.accept(req.auth!.userId, v) });
});
router.post("/invitations/:id/resend", mailLimit, async (req,res) => {
  const id = z.uuid().parse(req.params.id);
  const actor = { ...req.auth!, businessId: await service.invitationBusiness(id) };
  res.json({ success: true, data: await service.resend(actor, id) });
});
router.delete("/invitations/:id", async (req,res) => {
  const id = z.uuid().parse(req.params.id);
  const actor = { ...req.auth!, businessId: await service.invitationBusiness(id) };
  res.json({ success: true, data: await service.cancel(actor, id) });
});
export default router;
