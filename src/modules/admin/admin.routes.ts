import { Router } from "express";
import adminController from "./admin.controller.js";
import {
  protect,
  authorize,
} from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";

import {
  userListQuerySchema,
  changeRoleSchema,
  changeStatusSchema,
  analyticsQuerySchema,
  detectionListQuerySchema,
} from "./admin.validation.js";

const router = Router();

// All admin routes require authentication + admin role
router.use(
  protect,
  authorize("ADMIN")
);

// ── Dashboard ────────────────────────────────────────────────────────────────

router.get(
  "/stats",
  adminController.getPlatformStats
);

// ── Analytics ────────────────────────────────────────────────────────────────

router.get(
  "/analytics/detections",
  validate(analyticsQuerySchema, "query"),
  adminController.getDetectionTrends
);

router.get(
  "/analytics/diseases",
  validate(analyticsQuerySchema, "query"),
  adminController.getDiseaseFrequency
);

router.get(
  "/analytics/regional",
  validate(analyticsQuerySchema, "query"),
  adminController.getRegionalDistribution
);

router.get(
  "/analytics/consultations",
  validate(analyticsQuerySchema, "query"),
  adminController.getConsultationStats
);

router.get(
  "/analytics/community",
  validate(analyticsQuerySchema, "query"),
  adminController.getCommunityStats
);

// ── User Management ──────────────────────────────────────────────────────────

router.get(
  "/users",
  validate(userListQuerySchema, "query"),
  adminController.getUsers
);

router.get(
  "/users/:id",
  adminController.getUserById
);

router.patch(
  "/users/:id/role",
  validate(changeRoleSchema, "body"),
  adminController.changeUserRole
);

router.patch(
  "/users/:id/status",
  validate(changeStatusSchema, "body"),
  adminController.changeUserStatus
);

router.delete(
  "/users/:id",
  adminController.deleteUser
);

// ── Expert Approval ──────────────────────────────────────────────────────────

router.get(
  "/experts/pending",
  adminController.getPendingExperts
);

router.patch(
  "/experts/:id/approve",
  adminController.approveExpert
);

router.patch(
  "/experts/:id/reject",
  adminController.rejectExpert
);

// ── Monitoring ───────────────────────────────────────────────────────────────

router.get(
  "/detections",
  validate(detectionListQuerySchema),
  adminController.getAllDetections
);

router.get(
  "/alerts",
  adminController.getAllAlerts
);

export default router;