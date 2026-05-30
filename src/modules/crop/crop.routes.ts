import { Router } from "express";

import cropController from "./crop.controller.js";
import validate from "../../middlewares/validate.middleware.js";

import {
  createCropSchema,
  updateCropSchema,
} from "./crop.validation.js";

/**
 * Nested router under:
 * /farms/:farmId/crops
 *
 * IMPORTANT:
 * mergeParams enables access to farmId from parent router
 */
const router = Router({ mergeParams: true });

/**
 * Create crop for a farm
 */
router.post(
  "/",
  validate(createCropSchema),
  cropController.addCrop
);

/**
 * Get all crops for a farm
 */
router.get("/", cropController.getCropsForFarm);

/**
 * Get single crop
 */
router.get("/:cropId", cropController.getCropById);

/**
 * Update crop
 */
router.patch(
  "/:cropId",
  validate(updateCropSchema),
  cropController.updateCrop
);

/**
 * Delete crop
 */
router.delete("/:cropId", cropController.deleteCrop);

export default router;