import { Router } from "express";
import notificationController from "./notification.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = Router();

// ─────────────────────────────────────────────
// AUTH GATE (ALL ROUTES PROTECTED)
// ─────────────────────────────────────────────
router.use(protect);

// ─────────────────────────────────────────────
// CORE ROUTES
// ─────────────────────────────────────────────

// Get paginated notifications
router.get("/", notificationController.getNotifications);

// Get unread count (badge)
router.get("/unread-count", notificationController.getUnreadCount);

// Mark all notifications as read
router.patch("/mark-all-read", notificationController.markAllAsRead);

// Mark single notification as read
router.patch("/:id/read", notificationController.markAsRead);

// Delete notification
router.delete("/:id", notificationController.deleteNotification);

export default router;