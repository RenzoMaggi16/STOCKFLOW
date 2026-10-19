import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import oauthRoutes from "./routes/oauth.routes";
import businessRoutes from "./routes/businesses.routes";
import reportsRoutes from "./routes/reports.routes";
import { authenticate, verified, businessContext } from "./middleware/auth";
import authRoutes from "./routes/auth.routes";
import inventoryRoutes from "./routes/inventory.routes";
import demoRoutes from "./routes/demo.routes";
import { notFound, errorHandler } from "./middleware/errors";
const app = express();
app.disable("x-powered-by");
app.use(helmet());
const allow = env.CORS_ORIGINS.split(",")
  .map((x) => x.trim())
  .filter(Boolean);
app.use(
  cors({ origin: (origin, cb) => cb(null, !origin || allow.includes(origin)) }),
);
app.use(express.json({ limit: "32kb" }));
app.get("/api/health", (_req, res) =>
  res.json({ success: true, message: "StockFlow API funcionando" }),
);
app.use("/api/auth/social", oauthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", authenticate, verified, businessRoutes);
app.use("/api", businessContext);
app.use("/api/demo", demoRoutes);
app.use("/api", reportsRoutes);
app.use("/api", inventoryRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
