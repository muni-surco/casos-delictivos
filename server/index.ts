import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { handleDemo } from "./routes/demo";
import { listCases, getCase, createCase, updateCase, deleteCase, uploadMedia, deleteMedia } from "./routes/cases";
import authRoutes from "./routes/auth";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve uploads statically (in production builds this may be handled by static hosting as well)
  const uploadsPath = path.resolve(process.cwd(), "public", "uploads");
  app.use("/uploads", express.static(uploadsPath));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Auth helper
  app.use("/api", authRoutes);

  // Crime cases API
  app.get("/api/cases", listCases);
  app.get("/api/cases/:id", getCase);
  app.post("/api/cases", createCase);
  app.put("/api/cases/:id", updateCase);
  app.delete("/api/cases/:id", deleteCase);
  app.post("/api/cases/:id/media", uploadMedia);
  app.delete("/api/cases/:id/media/:mediaId", deleteMedia);

  return app;
}
