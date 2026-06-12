import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import alertService from "./alert.service.js";
import sendResponse from "../../utils/sendResponse.js";
import AppError from "../../utils/AppError.js";
import { AlertQueryInput } from "./alert.validation.js";

const createAlert = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError("Unauthorized", 401);

    const alert = await alertService.createAlert(userId, req.body);

    sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Disease alert created and farmers notified",
      data: { alert },
    });
  } catch (error) {
    next(error);
  }
};

const getAlerts = async (
  req: Request<{}, {}, {}, AlertQueryInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { alerts, meta } = await alertService.getAlerts(req.query);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Alerts retrieved successfully",
      data: { alerts },
      meta,
    });
  } catch (error) {
    next(error);
  }
};

const getAlertsForFarmer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError("Unauthorized", 401);

    const alerts = await alertService.getAlertsForFarmer(userId);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Regional alerts retrieved",
      data: { alerts },
    });
  } catch (error) {
    next(error);
  }
};

const getAlertById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const alert = await alertService.getAlertById(req.params.id as string);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Alert retrieved",
      data: { alert },
    });
  } catch (error) {
    next(error);
  }
};

const deactivateAlert = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const alert = await alertService.deactivateAlert(req.params.id as string);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Alert deactivated",
      data: { alert },
    });
  } catch (error) {
    next(error);
  }
};

const deleteAlert = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await alertService.deleteAlert(req.params.id as string);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Alert deleted",
    });
  } catch (error) {
    next(error);
  }
};

const alertController = {
  createAlert,
  getAlerts,
  getAlertsForFarmer,
  getAlertById,
  deactivateAlert,
  deleteAlert,
};

export default alertController;