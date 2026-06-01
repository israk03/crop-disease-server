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
  (req, _res, next) => {
    // Remove after debugging
    console.log("req.body:", req.body);
    console.log("req.file:", req.file?.originalname);
    next();
  },
  validate(createDetectionSchema),
  detectionController.createDetection
);

router.get(
  "/",
  validate(detectionQuerySchema),
  detectionController.getMyDetections
);

router.get(
  "/:id",
  validate(detectionIdParamSchema),
  detectionController.getDetectionById
);

router.delete(
  "/:id",
  authorize("FARMER"),
  validate(detectionIdParamSchema),
  detectionController.deleteDetection
);

router.patch(
  "/:id/share",
  authorize("FARMER"),
  validate(detectionIdParamSchema),
  detectionController.toggleSharing
);

export default router;