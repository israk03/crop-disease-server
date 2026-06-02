import { Router } from "express";

import detectionController from "./detection.controller.js";

import {
  protect,
  authorize,
} from "../../middlewares/auth.middleware.js";

import validate from "../../middlewares/validate.middleware.js";

import {
  createDetectionSchema,
  detectionQuerySchema,
  detectionIdParamSchema,
} from "./detection.validation.js";

import {
  uploadSingleImage,
} from "../../middlewares/upload.middleware.js";

const router = Router();

router.use(protect);

router.post(
  "/",
  authorize("FARMER"),
  uploadSingleImage("cropImage"),
  validate(createDetectionSchema, "body"),
  detectionController.createDetection
);

router.get(
  "/",
  validate(detectionQuerySchema, "query"),
  detectionController.getMyDetections
);

router.get(
  "/:id",
  validate(detectionIdParamSchema, "params"),
  detectionController.getDetectionById
);

router.delete(
  "/:id",
  authorize("FARMER"),
  validate(detectionIdParamSchema, "params"),
  detectionController.deleteDetection
);

router.patch(
  "/:id/share",
  authorize("FARMER"),
  validate(detectionIdParamSchema, "params"),
  detectionController.toggleSharing
);

export default router;