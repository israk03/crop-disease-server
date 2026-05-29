import { Router } from "express";

import authController from "./auth.controller.js";

import validate from "../../middlewares/validate.middleware.js";

import { protect } from "../../middlewares/auth.middleware.js";

import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "./auth.validation.js";

const router = Router();

// ─────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────

router.post(
  "/register",
  validate(registerSchema),
  authController.register
);

router.post(
  "/login",
  validate(loginSchema),
  authController.login
);

router.post(
  "/refresh-token",
  validate(refreshTokenSchema),
  authController.refreshToken
);

// ─────────────────────────────────────────────────────────
// PROTECTED ROUTES
// ─────────────────────────────────────────────────────────

router.post(
  "/logout",
  protect,
  authController.logout
);

router.get(
  "/me",
  protect,
  authController.getMe
);

export default router;
