import { Router } from "express";
import { z } from "zod";
import { authorize } from "../middleware/auth";
import { idSchema, listSchema } from "../validators/inventory";
import * as reports from "../services/reports.service";
const router = Router();
const filters = z
  .object({
    desde: z.iso.date().optional(),
    hasta: z.iso.date().optional(),
    categoria_id: idSchema.optional(),
    producto_id: idSchema.optional(),
  })
  .strict()
  .refine(
    (v) => !v.desde || !v.hasta || v.desde <= v.hasta,
    "Período inválido",
  );
router.get("/dashboard", async (req, res) => {
  res.json({success:true,data:await reports.dashboard(req.auth!)});
});
router.use("/reports", authorize("admin", "encargado"));
router.get("/reports/summary", async (req, res) =>
  res.json({
    success: true,
    data: await reports.summary(req.auth!.businessId, filters.parse(req.query)),
  }),
);
router.get("/reports/stock-value", async (req, res) => {
  const f = filters.parse(req.query);
  res.json({
    success: true,
    data: {
      summary: await reports.summary(req.auth!.businessId, f),
      categorias: await reports.categories(req.auth!.businessId, f),
    },
  });
});
router.get("/reports/movements", async (req, res) =>
  res.json({
    success: true,
    data: await reports.movementReport(req.auth!.businessId, filters.parse(req.query)),
  }),
);
router.get("/reports/low-stock", async (req, res) => {
  const { page, limit, ...f } = filters
    .safeExtend({ page: listSchema.shape.page, limit: listSchema.shape.limit })
    .parse(req.query);
  res.json({ success: true, data: await reports.lowStock(req.auth!.businessId, f, page, limit) });
});
export default router;
