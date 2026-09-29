import path from "path";
import express from "express";
import app, { readDb, writeDb, findSourceDbJson, getActiveDbPath } from "./server-core.ts";

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

async function start() {
  // If running in Vercel Serverless environment, do not start HTTP listener
  if (process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return;
  }

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  });

  server.on("error", (err: any) => {
    console.error("Critical server listener error:", err);
  });
}

// Global process safeguards against crashes in production
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
});

const isServerlessEnv = !!(
  process.env.VERCEL || 
  process.env.NOW_REGION || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.LAMBDA_TASK_ROOT ||
  process.env.VERCEL_ENV
);

if (!isServerlessEnv) {
  start();
}

export default app;
export { app, readDb, writeDb, findSourceDbJson, getActiveDbPath };
