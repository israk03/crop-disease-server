import { Router } from "express";
import alertController from "./alert.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";
import {
  createAlertSchema,
  alertQuerySchema,
} from "./alert.validation.js";

const router = Router();

// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────

router.get(
  "/",
  validate(alertQuerySchema),
  alertController.getAlerts
);

// ⚠️ MUST come before "/:id"
router.get(
  "/my-region",
  protect,
  authorize("FARMER"),
  alertController.getAlertsForFarmer
);

// ─────────────────────────────────────────────
// PARAM ROUTES (IMPORTANT: after static routes)
// ─────────────────────────────────────────────

router.get("/:id", alertController.getAlertById);

// ─────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────

router.post(
  "/",
  protect,
  authorize("ADMIN"),
  validate(createAlertSchema),
  alertController.createAlert
);

router.patch(
  "/:id/deactivate",
  protect,
  authorize("ADMIN"),
  alertController.deactivateAlert
);

router.delete(
  "/:id",
  protect,
  authorize("ADMIN"),
  alertController.deleteAlert
);

export default router;