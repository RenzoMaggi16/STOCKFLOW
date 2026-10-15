import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../middleware/auth";
import {
  categorySchema,
  supplierSchema,
  productSchema,
  movementSchema,
  idSchema,
  listSchema,
} from "../validators/inventory";
import * as service from "../services/inventory.service";
import { detail, type Entity } from "../repositories/inventory.repository";
const router = Router();
router.use(authenticate, authorize("admin", "encargado", "empleado"));
function crud(entity: Entity, schema: z.ZodObject<z.ZodRawShape>) {
  router.get(`/${entity}`, async (req, res) =>
    res.json({
      success: true,
      data: await service.list(entity, listSchema.parse(req.query)),
    }),
  );
  router.get(`/${entity}/:id`, async (req, res) =>
    res.json({
      success: true,
      data: await detail(entity, idSchema.parse(req.params.id)),
    }),
  );
  router.post(`/${entity}`, authorize("admin", "encargado"), async (req, res) =>
    res.status(201).json({
      success: true,
      data: await service.save(
        entity,
        schema.parse(req.body) as Record<string, string | number | null>,
      ),
    }),
  );
  for (const method of ["patch", "put"] as const)
    router[method](
      `/${entity}/:id`,
      authorize("admin", "encargado"),
      async (req, res) => {
        const validator =
          method === "put"
            ? schema
            : schema
                .partial()
                .refine(
                  (v) => Object.keys(v).length > 0,
                  "Indicá al menos un campo",
                );
        res.json({
          success: true,
          data: await service.save(
            entity,
            validator.parse(req.body) as Record<string, string | number | null>,
            idSchema.parse(req.params.id),
          ),
        });
      },
    );
  router.delete(`/${entity}/:id`, authorize("admin"), async (req, res) => {
    await service.deactivate(entity, idSchema.parse(req.params.id));
    res.json({ success: true, message: "Registro desactivado" });
  });
}
crud("categories", categorySchema);
crud("suppliers", supplierSchema);
crud("products", productSchema);
router.post("/movements", async (req, res) =>
  res.status(201).json({
    success: true,
    data: await service.recordMovement(
      movementSchema.parse(req.body),
      req.auth!.userId,
      req.auth!.role,
    ),
  }),
);
router.get("/movements", async (req, res) => {
  const { page, limit } = listSchema
    .pick({ page: true, limit: true })
    .parse(req.query);
  res.json({
    success: true,
    data: await service.movements(
      req.auth!.userId,
      req.auth!.role,
      page,
      limit,
    ),
  });
});
export default router;
