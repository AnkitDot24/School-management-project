import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { fail } from "./utils/apiResponse.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
  app.use(cookieParser());
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(express.json({ limit: "2mb" }));
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
  app.get("/api/v1/health", (_req, res) => res.json({ success: true, message: "ok", data: { status: "up" }, errors: null }));
  app.use("/api/v1", routes);
  app.use((req, res) => fail(res, 404, `Route not found: ${req.method} ${req.path}`));
  app.use(errorHandler);
  return app;
}
