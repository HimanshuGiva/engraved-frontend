import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const listenOnPort = (port: number) => {
    const server = app.listen(port, HOST, () => {
      console.log(`GIVA Live-Engrave Server running on http://localhost:${port}`);
    });

    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        console.warn(`Port ${port} is already in use, trying ${port + 1}...`);
        server.close(() => listenOnPort(port + 1));
      } else {
        console.error("Server startup error:", error);
        process.exit(1);
      }
    });
  };

  listenOnPort(DEFAULT_PORT);
}

startServer();
