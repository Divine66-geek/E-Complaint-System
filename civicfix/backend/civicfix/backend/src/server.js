import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import complaintsRouter from "./routes/complaints.js";
import analyticsRouter from "./routes/analytics.js";
import authRouter from "./routes/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const configuredOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = process.env.NODE_ENV === "production"
  ? configuredOrigins
  : [...new Set([...configuredOrigins, "http://localhost:5173", "http://localhost:5174"])]

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));
app.use("/api/auth", authRouter);
app.use("/api/complaints", complaintsRouter);
app.use("/api/analytics", analyticsRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API gateway running on http://localhost:${PORT}`);
});
