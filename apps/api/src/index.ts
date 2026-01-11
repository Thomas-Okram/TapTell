// apps/api/src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";

import { env } from "./config/env.js";

import kioskRoutes from "./routes/kiosk.js";
import mediaRoutes from "./routes/media.js";
import adminRoutes from "./routes/admin.js";
import adminLoginRoutes from "./routes/adminLogin.js";
import studentsRoutes from "./routes/students.js";
import cardsRoutes from "./routes/cards.js";
import attendanceRoutes from "./routes/attendance.js";
import devicesRoutes from "./routes/devices.js";
import superRoutes from "./routes/super.js";

const app = express();

app.use(helmet());

// If env.CORS_ORIGIN not set, allow any origin (fine for same-domain demo behind nginx)
const corsOrigin =
  env.CORS_ORIGIN && env.CORS_ORIGIN.trim().length > 0
    ? env.CORS_ORIGIN.split(",").map((s) => s.trim())
    : true;

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "15mb" }));
app.use(morgan("dev"));

// Health (both, so it's easy to check directly and via /api)
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "taptell-api",
    time: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "taptell-api",
    time: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

// Routes
app.use("/api/kiosk", kioskRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/devices", devicesRoutes);

// Admin
app.use("/api/admin", adminLoginRoutes);
app.use("/api/admin", adminRoutes);

// School CRUD
app.use("/api/students", studentsRoutes);
app.use("/api/cards", cardsRoutes);
app.use("/api/attendance", attendanceRoutes);

// Super admin
app.use("/api/super", superRoutes);

// 404
app.use((_req, res) =>
  res.status(404).json({ ok: false, error: "Route not found" })
);

// Error handler
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("❌ Unhandled error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
);

async function start() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("✅ MongoDB connected");

  const port = Number(env.PORT || 4000);
  app.listen(port, "0.0.0.0", () =>
    console.log(`✅ API running on http://0.0.0.0:${port}`)
  );
}

start().catch((err) => {
  console.error("❌ Failed to start API:", err);
  process.exit(1);
});
