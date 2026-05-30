import { Router } from "express";

import farmController from "./farm.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";

import {
  createFarmSchema,
  updateFarmSchema,
} from "./farm.validation.js";

//import cropRoutes from "../crop/crop.routes.js";

const router = Router();

/**
 * All farm routes are protected
 * Only FARMER role can access farm module
 */
router.use(protect, authorize("FARMER"));

/**
 * Farm CRUD
 */
router.post(
  "/",
  validate(createFarmSchema),
  farmController.createFarm
);

router.get("/", farmController.getMyFarms);

router.get("/:farmId", farmController.getFarmById);

router.patch(
  "/:farmId",
  validate(updateFarmSchema),
  farmController.updateFarm
);

router.delete("/:farmId", farmController.deleteFarm);

/**
 * Nested Crop Routes
 * IMPORTANT: cropRoutes must use mergeParams: true
 * so farmId is accessible inside crop module
 */
//router.use("/:farmId/crops", cropRoutes);

export default router;