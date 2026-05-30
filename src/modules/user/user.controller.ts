
import { Request } from "express";
import { StatusCodes } from "http-status-codes";
import userService from "./user.service.js";
import sendResponse from "../../utils/sendResponse.js";
import AppError from "../../utils/AppError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";


/**
 * ─────────────────────────────────────────────
 * Get Profile
 * ─────────────────────────────────────────────
 */
const getProfile = asyncHandler(async (req: Request, res: any) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await userService.getProfile(userId);

  sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: { user },
  });
});

/**
 * ─────────────────────────────────────────────
 * Update Profile
 * ─────────────────────────────────────────────
 */
const updateProfile = asyncHandler(async (req: Request, res: any) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await userService.updateProfile(userId, req.body);

  sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: "Profile updated successfully",
    data: { user },
  });
});

/**
 * ─────────────────────────────────────────────
 * Update Avatar
 * ─────────────────────────────────────────────
 */
const updateAvatar = asyncHandler(async (req: Request, res: any) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  if (!req.file?.buffer) {
    throw new AppError("Please upload an image file", 400);
  }

  const user = await userService.updateAvatar(userId, req.file.buffer);

  sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: "Avatar updated successfully",
    data: { user },
  });
});

/**
 * ─────────────────────────────────────────────
 * Remove Avatar
 * ─────────────────────────────────────────────
 */
const removeAvatar = asyncHandler(async (req: Request, res: any) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await userService.removeAvatar(userId);

  sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: "Avatar removed successfully",
    data: { user },
  });
});

/**
 * ─────────────────────────────────────────────
 * Update Expert Profile
 * ─────────────────────────────────────────────
 */
const updateExpertProfile = asyncHandler(async (req: Request, res: any) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await userService.updateExpertProfile(userId, req.body);

  sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: "Expert profile updated successfully",
    data: { user },
  });
});

/**
 * ─────────────────────────────────────────────
 * Change Password
 * ─────────────────────────────────────────────
 */
const changePassword = asyncHandler(async (req: Request, res: any) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const result = await userService.changePassword(userId, req.body);

  sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
  });
});

const userController = {
  getProfile,
  updateProfile,
  updateAvatar,
  removeAvatar,
  updateExpertProfile,
  changePassword,
};

export default userController;