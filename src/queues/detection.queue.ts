import { Queue } from "bullmq";

import { redis } from "../config/redis.js";

export const DETECTION_QUEUE_NAME =
  "crop-detection";

export interface DetectionJobData {
  detectionId: string;
  imageUrl: string;
  cropType: string;
  ownerId: string;
}

export const detectionQueue =
  new Queue<DetectionJobData>(
    DETECTION_QUEUE_NAME,
    {
      connection: redis as any,

      defaultJobOptions: {
        attempts: 3,

        backoff: {
          type: "exponential",
          delay: 2000,
        },

        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 1000,
        },

        removeOnFail: {
          age: 7 * 24 * 60 * 60,
          count: 500,
        },
      },
    }
  );

detectionQueue.on("error", (error) => {
  console.error(
    "[Detection Queue Error]",
    error
  );
});