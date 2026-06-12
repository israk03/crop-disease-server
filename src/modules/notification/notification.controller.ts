import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import notificationService from "../../services/notification.service.js";
import sendResponse from "../../utils/sendResponse.js";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const getSafePagination = (req: Request) => {
  const pageRaw = Number(req.query.page);
  const limitRaw = Number(req.query.limit);

  return {
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    limit: Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 100 ? limitRaw : 20,
  };
};

const getUserId = (req: Request) => {
  const userId = req.user?.id;
  if (!userId) throw new Error("Unauthorized");
  return userId;
};

// ─────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────

const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { page, limit } = getSafePagination(req);

    const result = await notificationService.getUserNotifications(
      userId,
      page,
      limit
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Notifications retrieved successfully",
      data: {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
      },
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const unreadCount = await notificationService.getUnreadCount(userId);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Unread count retrieved successfully",
      data: { unreadCount },
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);

    await notificationService.markAsRead(req.params.id as string, userId);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);

    await notificationService.markAllAsRead(userId);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);

    await notificationService.deleteNotification(req.params.id as string, userId);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

const notificationController = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

export default notificationController;