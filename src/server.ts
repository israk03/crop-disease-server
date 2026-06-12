import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { createServer } from "http";

import app from "./app.js";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { redis } from "./config/redis.js";
import { env } from "./config/env.js";
import { setupSocket } from "./socket/socket.js";

const startServer = async (): Promise<void> => {
  try {

    // ─────────────────────────────
    // 1. Database
    // ─────────────────────────────
    await connectDB();

    // ─────────────────────────────
    // 2. Redis
    // ─────────────────────────────
    if (redis.status === "end" || redis.status === "wait") {
      await redis.connect();
    }

    // ─────────────────────────────
    // 3. HTTP Server
    // ─────────────────────────────
    const httpServer = createServer(app);

    const io = setupSocket(httpServer);

    httpServer.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
      console.log(`📦 Environment: ${env.NODE_ENV}`);
      console.log(`🔌 Socket.io ready`);
    });

    // ─────────────────────────────
    // 4. Graceful Shutdown
    // ─────────────────────────────
    let isShuttingDown = false;
    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`\n📡 ${signal} received. Shutting down...`);

      httpServer.close(async () => {
        try {
          io.close();
console.log("🛑 Socket.io disconnected");

await redis.quit();
console.log("🛑 Redis disconnected");

await mongoose.connection.close();
console.log("🛑 MongoDB disconnected");
        } catch (err) {
          console.error("❌ Shutdown error:", err);
        }

        console.log("✅ Server stopped cleanly");
        process.exit(0);
      });

      // force shutdown fallback
      setTimeout(() => {
        console.error("⚠️ Forced shutdown");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("💥 Server startup failed:", error);
    process.exit(1);
  }
};

startServer();

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
  process.exit(1);
});