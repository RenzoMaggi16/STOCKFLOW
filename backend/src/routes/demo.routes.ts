import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
const router = Router();
router.get(
  "/empleado",
  authenticate,
  authorize("empleado", "encargado", "admin"),
  (req, res) =>
    res.json({ success: true, message: "Área de empleados", data: req.auth }),
);
router.get(
  "/encargado",
  authenticate,
  authorize("encargado", "admin"),
  (req, res) =>
    res.json({ success: true, message: "Área de encargados", data: req.auth }),
);
router.get("/admin", authenticate, authorize("admin"), (req, res) =>
  res.json({
    success: true,
    message: "Área de administradores",
    data: req.auth,
  }),
);
export default router;
