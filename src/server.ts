import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { createServer } from "http";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { redis } from "./config/redis.js";
import { env } from "./config/env.js";

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

    httpServer.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
      console.log(`📦 Environment: ${env.NODE_ENV}`);
    });

    // ─────────────────────────────
    // 4. Graceful Shutdown
    // ─────────────────────────────
    const shutdown = async (signal: string) => {
      console.log(`\n📡 ${signal} received. Shutting down...`);

      httpServer.close(async () => {
        try {
          await redis.quit(); 
          console.log("🛑 Redis disconnected");
        } catch (err) {
          console.error("❌ Redis shutdown error:", err);
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