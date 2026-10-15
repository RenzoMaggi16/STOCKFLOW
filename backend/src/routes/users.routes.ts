import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../middleware/auth";
import { idSchema, listSchema } from "../validators/inventory";
import * as users from "../services/users.service";
const router = Router();
router.use(authenticate, authorize("admin"));
router.get("/", async (req, res) => {
  const q = listSchema
    .pick({ q: true, page: true, limit: true })
    .extend({ rol: z.enum(["admin", "encargado", "empleado"]).optional() })
    .parse(req.query);
  res.json({
    success: true,
    data: await users.list(q.q || "", q.rol, q.page, q.limit),
  });
});
router.get("/:id", async (req, res) =>
  res.json({
    success: true,
    data: await users.detail(idSchema.parse(req.params.id)),
  }),
);
router.patch("/:id", async (req, res) => {
  const { nombre } = z
    .object({ nombre: z.string().trim().min(2).max(100) })
    .strict()
    .parse(req.body);
  res.json({
    success: true,
    data: await users.edit(idSchema.parse(req.params.id), nombre),
  });
});
router.patch("/:id/role", async (req, res) => {
  const v = z
    .object({ rol: z.enum(["admin", "encargado", "empleado"]) })
    .strict()
    .parse(req.body);
  res.json({
    success: true,
    data: await users.change(
      req.auth!.userId,
      idSchema.parse(req.params.id),
      v,
    ),
  });
});
router.patch("/:id/status", async (req, res) => {
  const v = z.object({ activo: z.boolean() }).strict().parse(req.body);
  res.json({
    success: true,
    data: await users.change(
      req.auth!.userId,
      idSchema.parse(req.params.id),
      v,
    ),
  });
});
export default router;
