import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("strictQuery", true);

export const connectDB = async (): Promise<void> => {
  try {
    const connection = await mongoose.connect(env.MONGODB_URI);

    console.log("✅ MongoDB connected");
    console.log(`📦 Database: ${connection.connection.name}`);
    console.log(`🌐 Host: ${connection.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed");

    if (error instanceof Error) {
      console.error(`Reason: ${error.message}`);
    }

    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log("🛑 MongoDB disconnected");
  } catch (error) {
    console.error("❌ Error disconnecting MongoDB", error);
  }
};