import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { Job, Worker } from "bullmq";
import { connectDB } from "../config/db.js";
import { redis } from "../config/redis.js";

import Detection from "../models/detection.model.js";

import {
  DETECTION_QUEUE_NAME,
  DetectionJobData,
} from "../queues/detection.queue.js";

import { analyzeCropImage } from "../services/ai.service.js";

import { emitToUser } from "../socket/socket.js";
import { SOCKET_EVENTS } from "../socket/socket.events.js";

const ANALYSIS_FAILED_MESSAGE =
  "Analysis failed. Please try again.";

const createWorker = () =>
  new Worker<DetectionJobData>(
    DETECTION_QUEUE_NAME,
    async (job: Job<DetectionJobData>) => {
      const { detectionId, imageUrl, ownerId } = job.data;

      console.log(
        `[Detection Worker] Processing ${detectionId}`
      );

      try {
        const detection =
          await Detection.findById(detectionId);

        if (!detection) {
          throw new Error(
            `Detection not found: ${detectionId}`
          );
        }

        await Detection.findByIdAndUpdate(detectionId, {
          status: "PROCESSING",
        });

        const aiResult =
          await analyzeCropImage(imageUrl);

        await Detection.findByIdAndUpdate(detectionId, {
          status: "COMPLETED",
          aiResult,
          errorMessage: null,
        });

        emitToUser(
          ownerId,
          SOCKET_EVENTS.DETECTION_COMPLETED,
          {
            detectionId,
            diseaseName: aiResult.diseaseName,
            severityLevel: aiResult.severityLevel,
            isHealthy: aiResult.isHealthy,
          }
        );

        console.log(
          `[Detection Worker] Completed ${detectionId}`
        );
      } catch (error) {
        console.error(
          `[Detection Worker] Error ${detectionId}:`,
          error
        );

        await Detection.findByIdAndUpdate(detectionId, {
          status: "FAILED",
          errorMessage: ANALYSIS_FAILED_MESSAGE,
        });

        emitToUser(
          ownerId,
          SOCKET_EVENTS.DETECTION_FAILED,
          {
            detectionId,
            message: ANALYSIS_FAILED_MESSAGE,
          }
        );
      }
    },
    {
      connection: redis as any,
      concurrency: 3,
    }
  );

const startWorker = async () => {
  await connectDB();

  console.log("🔄 Detection worker started");

  const worker = createWorker();

  worker.on("completed", (job) => {
    console.log(
      `[Detection Worker] Job ${job.id} completed`
    );
  });

  worker.on("failed", async (job, error) => {
    console.error(
      `[Detection Worker] Job ${job?.id} failed`,
      error.message
    );

    if (!job) return;

    const maxAttempts = job.opts.attempts ?? 1;

    const isFinalFailure =
      job.attemptsMade >= maxAttempts;

    if (!isFinalFailure) return;

    await Detection.findByIdAndUpdate(
      job.data.detectionId,
      {
        status: "FAILED",
        errorMessage: ANALYSIS_FAILED_MESSAGE,
      }
    );

    emitToUser(
      job.data.ownerId,
      SOCKET_EVENTS.DETECTION_FAILED,
      {
        detectionId: job.data.detectionId,
        message: ANALYSIS_FAILED_MESSAGE,
      }
    );
  });

  worker.on("error", (error) => {
    console.error("[Detection Worker Error]", error);
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} received. Closing worker...`);

    await worker.close();

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

startWorker().catch((error) => {
  console.error("💥 Failed to start worker:", error);
  process.exit(1);
});