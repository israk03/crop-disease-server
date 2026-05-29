import * as IORedis from "ioredis";
import { env } from "./env.js";

export const redis = new IORedis.Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,

  maxRetriesPerRequest: null,
  lazyConnect: true,

  retryStrategy(times: number) {
    return Math.min(times * 100, 2000);
  },
});

redis.on("connect", () => {
  console.log("🔌 Connecting to Redis...");
});

redis.on("ready", () => {
  console.log("✅ Redis ready");
});

redis.on("reconnecting", () => {
  console.warn("🔄 Redis reconnecting...");
});

redis.on("close", () => {
  console.warn("⚠️ Redis connection closed");
});

redis.on("error", (error: Error) => {
  console.error("❌ Redis error:", error.message);
});

export const connectRedis = async (): Promise<void> => {
  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
  } catch (error) {
    console.error("❌ Failed to connect Redis");

    if (error instanceof Error) {
      console.error(error.message);
    }

    process.exit(1);
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    await redis.quit();
    console.log("🛑 Redis disconnected");
  } catch (error) {
    console.error("❌ Failed to disconnect Redis");

    if (error instanceof Error) {
      console.error(error.message);
    }
  }
};