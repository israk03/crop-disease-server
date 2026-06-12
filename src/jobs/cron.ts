import cron from "node-cron";
import { detectOutbreaks } from "../modules/alert/alert.service.js";
import { recalculateTrendingScores } from "../modules/forum/forum.service.js";
import Alert from "../models/alert.model.js";

// ─────────────────────────────────────────────
// Simple in-memory locks (prevents overlap per instance)
// ─────────────────────────────────────────────

let isOutbreakJobRunning = false;
let isTrendingJobRunning = false;
let isCleanupJobRunning = false;

// ─────────────────────────────────────────────
// Job 1: Outbreak Detection (every hour)
// ─────────────────────────────────────────────

const outbreakDetectionJob = cron.schedule("0 * * * *", async () => {
  if (isOutbreakJobRunning) {
    console.log("⏳ Outbreak job already running, skipping...");
    return;
  }

  isOutbreakJobRunning = true;

  console.log("⏰ [CRON] Running outbreak detection job...");

  try {
    await detectOutbreaks();
  } catch (error) {
    console.error("❌ [CRON] Outbreak detection job failed:", error);
  } finally {
    isOutbreakJobRunning = false;
  }
});

// ─────────────────────────────────────────────
// Job 2: Trending Score Recalculation (every 6 hours)
// ─────────────────────────────────────────────

const trendingScoreJob = cron.schedule("0 */6 * * *", async () => {
  if (isTrendingJobRunning) {
    console.log("⏳ Trending job already running, skipping...");
    return;
  }

  isTrendingJobRunning = true;

  console.log("⏰ [CRON] Recalculating trending scores...");

  try {
    await recalculateTrendingScores();
  } catch (error) {
    console.error("❌ [CRON] Trending score job failed:", error);
  } finally {
    isTrendingJobRunning = false;
  }
});

// ─────────────────────────────────────────────
// Job 3: Alert Cleanup (daily midnight)
// ─────────────────────────────────────────────

const alertCleanupJob = cron.schedule("0 0 * * *", async () => {
  if (isCleanupJobRunning) {
    console.log("⏳ Cleanup job already running, skipping...");
    return;
  }

  isCleanupJobRunning = true;

  console.log("⏰ [CRON] Running alert cleanup job...");

  try {
    const result = await Alert.updateMany(
      {
        isActive: true,
        expiresAt: { $lte: new Date() },
      },
      { isActive: false }
    );

    console.log(
      `✅ [CRON] Deactivated ${result.modifiedCount} expired alerts`
    );
  } catch (error) {
    console.error("❌ [CRON] Alert cleanup job failed:", error);
  } finally {
    isCleanupJobRunning = false;
  }
});

// ─────────────────────────────────────────────
// Start all jobs (called from server.ts)
// ─────────────────────────────────────────────

export const startCronJobs = (): void => {
  outbreakDetectionJob.start();
  trendingScoreJob.start();
  alertCleanupJob.start();

  console.log("⏰ Cron jobs started:");
  console.log("   - Outbreak detection: every hour");
  console.log("   - Trending scores: every 6 hours");
  console.log("   - Alert cleanup: daily at midnight");
};

// ─────────────────────────────────────────────
// Stop all jobs (graceful shutdown)
// ─────────────────────────────────────────────

export const stopCronJobs = (): void => {
  outbreakDetectionJob.stop();
  trendingScoreJob.stop();
  alertCleanupJob.stop();

  console.log("⏰ Cron jobs stopped");
};