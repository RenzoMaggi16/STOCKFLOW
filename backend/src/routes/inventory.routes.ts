import { Router } from "express";
import { z } from "zod";
import { authorize } from "../middleware/auth";
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
import {productValues,saveProductValues,valuesSchema} from '../services/product-values.service';
router.use(authorize("admin", "encargado", "empleado", "repartidor"));
router.get('/product-values',async(req,res)=>res.json({success:true,data:await productValues(req.auth!.businessId)}));
router.put('/product-values',authorize('admin','encargado'),async(req,res)=>res.json({success:true,data:await saveProductValues(req.auth!,valuesSchema.parse(req.body))}));
function crud(entity: Entity, schema: z.ZodObject<z.ZodRawShape>) {
  router.get(`/${entity}`, async (req, res) =>
    res.json({
      success: true,
      data: await service.list(req.auth!.businessId, entity, listSchema.parse(req.query)),
    }),
  );
  router.get(`/${entity}/:id`, async (req, res) =>
    res.json({
      success: true,
      data: await detail(entity, idSchema.parse(req.params.id), req.auth!.businessId),
    }),
  );
  router.post(`/${entity}`, authorize("admin", "encargado"), async (req, res) =>
    res.status(201).json({
      success: true,
      data: await service.save(
        req.auth!,
        entity,
        (entity === "products" ? schema.extend({stock_inicial:z.number().int().min(0).max(2147483647).optional()}) : schema).parse(req.body) as Record<string, string | number | null>,
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
            req.auth!,
            entity,
            validator.parse(req.body) as Record<string, string | number | null>,
            idSchema.parse(req.params.id),
          ),
        });
      },
    );
  router.delete(`/${entity}/:id`, authorize("admin"), async (req, res) => {
    await service.deactivate(req.auth!, entity, idSchema.parse(req.params.id));
    res.json({ success: true, message: "Registro desactivado" });
  });
}
crud("categories", categorySchema);
crud("suppliers", supplierSchema);
crud("products", productSchema);
router.post("/movements", authorize("encargado"), async (req, res) =>
  res.status(201).json({
    success: true,
    data: await service.recordMovement(
      movementSchema.parse(req.body),
      req.auth!,
    ),
  }),
);
router.post("/stock/receive", authorize("encargado"), async (req,res) => res.status(201).json({success:true,data:await service.recordMovement(movementSchema.parse({...req.body,tipo:"entrada"}),req.auth!)}));
router.post("/stock/ordinary-adjustment", authorize("encargado"), async (req,res) => res.status(201).json({success:true,data:await service.recordMovement(movementSchema.parse({...req.body,tipo:"ajuste"}),req.auth!)}));
router.get("/movements", authorize("admin", "encargado", "empleado"), async (req, res) => {
  const { page, limit } = listSchema
    .pick({ page: true, limit: true })
    .parse(req.query);
  res.json({
    success: true,
    data: await service.movements(
      req.auth!.businessId,
      req.auth!.userId,
      req.auth!.role,
      page,
      limit,
    ),
  });
});
export default router;
