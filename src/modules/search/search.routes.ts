import { Router } from "express";
import searchController from "./search.controller.js";
import {
  optionalProtect,
  protect,
  authorize,
} from "../../middlewares/auth.middleware.js";

const router = Router();

/**
 * ─────────────────────────────────────────────────────────────
 * Unified Search (Public + Auth-aware)
 * ─────────────────────────────────────────────────────────────
 * - Guests: posts, experts, farms, alerts
 * - Farmers: + detections (own data only)
 */
router.get(
  "/",
  optionalProtect,
  searchController.unifiedSearch
);

/**
 * ─────────────────────────────────────────────────────────────
 * Public Search Endpoints
 * ─────────────────────────────────────────────────────────────
 */

router.get(
  "/experts",
  searchController.searchExperts
);

router.get(
  "/posts",
  searchController.searchPosts
);

/**
 * ─────────────────────────────────────────────────────────────
 * Protected Search (Farmers only)
 * ─────────────────────────────────────────────────────────────
 * - Only searches OWN detection history
 */
router.get(
  "/detections",
  protect,
  authorize("FARMER"),
  searchController.searchDetections
);

export default router;