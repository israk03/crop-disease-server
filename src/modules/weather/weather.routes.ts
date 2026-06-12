import { Router } from "express";
import weatherController from "./weather.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

// All weather routes require authentication
router.use(protect);

// ── Farm-specific weather ────────────────────────────────
router.get(
  "/farm/:farmId",
  authorize("FARMER", "EXPERT", "ADMIN"),
  weatherController.getWeatherForFarm
);

// ── Location-based weather (any logged-in user) ─────────────────────────────
router.get(
  "/location",
  weatherController.getWeatherByLocation
);

export default router;