import { Router } from "express";
import userController from "./user.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";
import { uploadSingleImage } from "../../middlewares/upload.middleware.js";
import { apiLimiter, strictLimiter } from "../../middlewares/rateLimit.middleware.js";
import { handleUploadErrors } from "../../middlewares/uploadError.middleware.js";

import {
  updateProfileSchema,
  updateExpertProfileSchema,
  changePasswordSchema,
} from "./user.validation.js";

const router = Router();

/**
 * ─────────────────────────────────────────────
 * Global protection + light rate limiting
 * ─────────────────────────────────────────────
 */
router.use(protect);
router.use(apiLimiter);

/**
 * ─────────────────────────────────────────────
 * Profile
 * ─────────────────────────────────────────────
 */
router.get("/profile", userController.getProfile);

router.patch(
  "/profile",
  validate(updateProfileSchema),
  userController.updateProfile
);

/**
 * ─────────────────────────────────────────────
 * Avatar upload (with upload safety middleware)
 * ─────────────────────────────────────────────
 */
router.patch(
  "/profile/avatar",
  uploadSingleImage("avatar"),
  handleUploadErrors,
  userController.updateAvatar
);

router.delete("/profile/avatar", userController.removeAvatar);

/**
 * ─────────────────────────────────────────────
 * Expert-only route
 * ─────────────────────────────────────────────
 */
router.patch(
  "/profile/expert",
  authorize("EXPERT"),
  validate(updateExpertProfileSchema),
  userController.updateExpertProfile
);

/**
 * ─────────────────────────────────────────────
 * Password change (STRICT limiter)
 * ─────────────────────────────────────────────
 */
router.patch(
  "/profile/password",
  strictLimiter,
  validate(changePasswordSchema),
  userController.changePassword
);

export default router;