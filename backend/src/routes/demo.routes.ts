import { Router } from "express";
import { authorize } from "../middleware/auth";
const router = Router();
router.get(
  "/empleado",
  authorize("empleado", "encargado", "admin"),
  (req, res) =>
    res.json({ success: true, message: "Área de empleados", data: req.auth }),
);
router.get(
  "/encargado",
  authorize("encargado", "admin"),
  (req, res) =>
    res.json({ success: true, message: "Área de encargados", data: req.auth }),
);
router.get("/admin", authorize("admin"), (req, res) =>
  res.json({
    success: true,
    message: "Área de administradores",
    data: req.auth,
  }),
);
export default router;
