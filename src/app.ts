import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.routes.js";
import { taskRouter } from "./routes/task.routes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin,
    }),
  );
  app.use(express.json({ limit: "100kb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/tasks", taskRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
