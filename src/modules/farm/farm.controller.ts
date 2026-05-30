import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import farmService from "./farm.service.js";
import sendResponse from "../../utils/sendResponse.js";
import catchAsync from "../../utils/catchAsync.js";
import { normalizeParam } from "../../utils/normalizeParam.js";

const createFarm = catchAsync(async (req: Request, res: Response) => {
  const farm = await farmService.createFarm(req.user!.id, req.body);

  sendResponse({
    res,
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Farm created successfully",
    data: { farm },
  });
});

const getMyFarms = catchAsync(async (req: Request, res: Response) => {
  const farms = await farmService.getMyFarms(req.user!.id);

  sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: "Farms retrieved successfully",
    data: { farms },
  });
});

const getFarmById = catchAsync(async (req: Request, res: Response) => {
  const farmId = normalizeParam(req.params.farmId);

  const farm = await farmService.getFarmById(
    farmId,
    req.user!.id
  );

  sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: "Farm retrieved successfully",
    data: { farm },
  });
});

const updateFarm = catchAsync(async (req: Request, res: Response) => {
  const farmId = normalizeParam(req.params.farmId);

  const farm = await farmService.updateFarm(
    farmId,
    req.user!.id,
    req.body
  );

  sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: "Farm updated successfully",
    data: { farm },
  });
});

const deleteFarm = catchAsync(async (req: Request, res: Response) => {
  const farmId = normalizeParam(req.params.farmId);

  await farmService.deleteFarm(farmId, req.user!.id);

  sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: "Farm deleted successfully",
  });
});

const farmController = {
  createFarm,
  getMyFarms,
  getFarmById,
  updateFarm,
  deleteFarm,
};

export default farmController;