import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import adminService from "./admin.service.js";
import sendResponse from "../../utils/sendResponse.js";

const getPlatformStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await adminService.getPlatformStats();

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Platform statistics retrieved",
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

const getDetectionTrends = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = Number(req.query.days) || 30;

    const trends = await adminService.getDetectionTrends(days);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Detection trends retrieved",
      data: { trends },
    });
  } catch (error) {
    next(error);
  }
};

const getDiseaseFrequency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = Number(req.query.days) || 30;

    const diseases = await adminService.getDiseaseFrequency(days);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Disease frequency data retrieved",
      data: { diseases },
    });
  } catch (error) {
    next(error);
  }
};

const getRegionalDistribution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = Number(req.query.days) || 30;

    const regional = await adminService.getRegionalDistribution(days);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Regional distribution data retrieved",
      data: { regional },
    });
  } catch (error) {
    next(error);
  }
};

const getConsultationStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = Number(req.query.days) || 30;

    const stats = await adminService.getConsultationStats(days);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Consultation statistics retrieved",
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

const getCommunityStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = Number(req.query.days) || 30;

    const stats = await adminService.getCommunityStats(days);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Community statistics retrieved",
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { users, meta } = await adminService.getUsers(
      req.query as any
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Users retrieved",
      data: { users },
      meta,
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await adminService.getUserById(
      req.params.id as string
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "User retrieved",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const changeUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await adminService.changeUserRole(
      req.params.id as string,
      req.body
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "User role updated",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

const changeUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await adminService.changeUserStatus(
      req.params.id as string,
      req.body
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"}`,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await adminService.deleteUser(req.params.id as string);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "User deleted",
    });
  } catch (error) {
    next(error);
  }
};

const getPendingExperts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const experts = await adminService.getPendingExperts();

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Pending expert approvals retrieved",
      data: { experts },
    });
  } catch (error) {
    next(error);
  }
};

const approveExpert = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expert = await adminService.approveExpert(
      req.params.id as string
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Expert approved successfully",
      data: { expert },
    });
  } catch (error) {
    next(error);
  }
};

const rejectExpert = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expert = await adminService.rejectExpert(
      req.params.id as string
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Expert application rejected",
      data: { expert },
    });
  } catch (error) {
    next(error);
  }
};

const getAllDetections = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { detections, meta } =
      await adminService.getAllDetections(
        req.query as any
      );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Detections retrieved",
      data: { detections },
      meta,
    });
  } catch (error) {
    next(error);
  }
};

const getAllAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const { alerts, meta } =
      await adminService.getAllAlerts(
        page,
        limit
      );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "All alerts retrieved",
      data: { alerts },
      meta,
    });
  } catch (error) {
    next(error);
  }
};

const adminController = {
  getPlatformStats,
  getDetectionTrends,
  getDiseaseFrequency,
  getRegionalDistribution,
  getConsultationStats,
  getCommunityStats,
  getUsers,
  getUserById,
  changeUserRole,
  changeUserStatus,
  deleteUser,
  getPendingExperts,
  approveExpert,
  rejectExpert,
  getAllDetections,
  getAllAlerts,
};

export default adminController;