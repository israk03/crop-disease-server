import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import AppError from "../../utils/AppError.js";
import sendResponse from "../../utils/sendResponse.js";

import detectionService from "./detection.service.js";

const createDetection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      throw new AppError(
        "Please upload a crop image",
        StatusCodes.BAD_REQUEST
      );
    }

    const detection =
      await detectionService.createDetection(
        req.user!.id,
        req.body,
        req.file.buffer
      );

    sendResponse({
      res,

      statusCode: StatusCodes.CREATED,

      success: true,

      message:
        "Image uploaded successfully. AI analysis has started.",

      data: {
        detection,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMyDetections = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result =
      await detectionService.getMyDetections(
        req.user!.id,
        req.query as never
      );

    sendResponse({
      res,

      statusCode: StatusCodes.OK,

      success: true,

      message:
        "Detection history retrieved successfully",

      data: {
        detections:
          result.detections,
      },

      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getDetectionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const detection =
      await detectionService.getDetectionById(
        req.params.id as string,
        req.user!.id
      );

    sendResponse({
      res,

      statusCode: StatusCodes.OK,

      success: true,

      message:
        "Detection retrieved successfully",

      data: {
        detection,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteDetection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await detectionService.deleteDetection(
      req.params.id as string,
      req.user!.id
    );

    sendResponse({
      res,

      statusCode: StatusCodes.OK,

      success: true,

      message:
        "Detection deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const toggleSharing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const detection =
      await detectionService.toggleSharing(
        req.params.id as string,
        req.user!.id
      );

    sendResponse({
      res,

      statusCode: StatusCodes.OK,

      success: true,

      message: detection.isShared
        ? "Detection shared with community"
        : "Detection removed from community",

      data: {
        detection,
      },
    });
  } catch (error) {
    next(error);
  }
};

const detectionController = {
  createDetection,

  getMyDetections,

  getDetectionById,

  deleteDetection,

  toggleSharing,
};

export default detectionController;