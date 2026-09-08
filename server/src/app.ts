import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env, isProd } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import memberRoutes from "./routes/members.js";
import { projectTasksRouter, taskRouter } from "./routes/tasks.js";
import dashboardRoutes from "./routes/dashboard.js";
import userRoutes from "./routes/users.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin and non-browser callers (curl, health checks) send no Origin header.
        if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
        // Reject by withholding the CORS headers rather than throwing: the browser
        // blocks the response either way, and throwing here would surface an
        // unfamiliar origin as a 500 in the logs. CORS is a browser policy, not
        // this server's authorization layer - that is what requireAuth is for.
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(isProd ? "combined" : "dev"));

  app.get("/api/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", database: "up", uptime: Math.round(process.uptime()) });
    } catch {
      res.status(503).json({ status: "degraded", database: "down" });
    }
  });

  app.use("/api/auth", authRoutes);

  // Everything below this line requires a valid session token.
  app.use("/api/users", requireAuth, userRoutes);
  app.use("/api/dashboard", requireAuth, dashboardRoutes);
  app.use("/api/projects/:projectId/members", requireAuth, memberRoutes);
  app.use("/api/projects/:projectId/tasks", requireAuth, projectTasksRouter);
  app.use("/api/projects", requireAuth, projectRoutes);
  app.use("/api/tasks", requireAuth, taskRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
