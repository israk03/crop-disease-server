import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import cropService from "./crop.service.js";
import sendResponse from "../../utils/sendResponse.js";
import catchAsync from "../../utils/catchAsync.js";
import { normalizeParam } from "../../utils/normalizeParam.js";

const addCrop = catchAsync(async (req: Request, res: Response) => {
  const farmId = normalizeParam(req.params.farmId);

  const crop = await cropService.addCrop(
    farmId,
    req.user!.id,
    req.body
  );

  sendResponse({
    res,
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Crop added successfully",
    data: { crop },
  });
});

const getCropsForFarm = catchAsync(async (req: Request, res: Response) => {
  const farmId = normalizeParam(req.params.farmId);

  const crops = await cropService.getCropsForFarm(
    farmId,
    req.user!.id
  );

  sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: "Crops retrieved successfully",
    data: { crops },
  });
});

const getCropById = catchAsync(async (req: Request, res: Response) => {
  const farmId = normalizeParam(req.params.farmId);
  const cropId = normalizeParam(req.params.cropId);

  const crop = await cropService.getCropById(
    farmId,
    cropId,
    req.user!.id
  );

  sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: "Crop retrieved successfully",
    data: { crop },
  });
});

const updateCrop = catchAsync(async (req: Request, res: Response) => {
  const farmId = normalizeParam(req.params.farmId);
  const cropId = normalizeParam(req.params.cropId);

  const crop = await cropService.updateCrop(
    farmId,
    cropId,
    req.user!.id,
    req.body
  );

  sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: "Crop updated successfully",
    data: { crop },
  });
});

const deleteCrop = catchAsync(async (req: Request, res: Response) => {
  const farmId = normalizeParam(req.params.farmId);
  const cropId = normalizeParam(req.params.cropId);

  const result = await cropService.deleteCrop(
    farmId,
    cropId,
    req.user!.id
  );

  sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: "Crop deleted successfully",
    data: result,
  });
});

const cropController = {
  addCrop,
  getCropsForFarm,
  getCropById,
  updateCrop,
  deleteCrop,
};

export default cropController;