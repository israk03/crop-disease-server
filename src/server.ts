import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { createServer } from "http";
import mongoose from "mongoose";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { redis } from "./config/redis.js";
import { env } from "./config/env.js";
import { setupSocket } from "./socket/socket.js";

// ─────────────────────────────
// CRON JOBS
// ─────────────────────────────
import { startCronJobs, stopCronJobs } from "./jobs/cron.js";

const startServer = async (): Promise<void> => {
  try {
    // ─────────────────────────────
    // 1. Database
    // ─────────────────────────────
    await connectDB();

    // ─────────────────────────────
    // 2. Redis
    // ─────────────────────────────
    if (redis.status !== "ready") {
      await redis.connect();
    }

    // ─────────────────────────────
    // 3. HTTP + Socket Server
    // ─────────────────────────────
    const httpServer = createServer(app);

    const io = setupSocket(httpServer);

    httpServer.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
      console.log(`📦 Environment: ${env.NODE_ENV}`);
      console.log(`🔌 Socket.io ready`);
    });

    // ─────────────────────────────
    // 4. START CRON JOBS
    // ─────────────────────────────
    startCronJobs();
    console.log("⏰ Cron jobs initialized");

    // ─────────────────────────────
    // 5. Graceful Shutdown
    // ─────────────────────────────
    let isShuttingDown = false;

    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\n📡 ${signal} received. Shutting down...`);

      httpServer.close(async () => {
        try {
          // ─────────────────────────────
          // STOP CRON JOBS FIRST
          // ─────────────────────────────
          stopCronJobs();
          console.log("⏰ Cron jobs stopped");

          // ─────────────────────────────
          // SOCKET SHUTDOWN
          // ─────────────────────────────
          io.close();
          console.log("🛑 Socket.io disconnected");

          // ─────────────────────────────
          // REDIS SHUTDOWN
          // ─────────────────────────────
          await redis.quit();
          console.log("🛑 Redis disconnected");

          // ─────────────────────────────
          // MONGODB SHUTDOWN
          // ─────────────────────────────
          await mongoose.connection.close();
          console.log("🛑 MongoDB disconnected");

          console.log("✅ Server closed cleanly");
          process.exit(0);
        } catch (err) {
          console.error("❌ Shutdown error:", err);
          process.exit(1);
        }
      });

      // fallback force shutdown
      setTimeout(() => {
        console.error("⚠️ Forced shutdown triggered");
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

// ─────────────────────────────
// GLOBAL ERROR HANDLERS
// ─────────────────────────────

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
  process.exit(1);
});