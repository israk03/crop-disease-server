import User from "../../models/user.model.js";
import AppError from "../../utils/AppError.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "../../services/upload.service.js";
import {
  UpdateProfileInput,
  UpdateExpertProfileInput,
  ChangePasswordInput,
} from "./user.validation.js";

/**
 * ─────────────────────────────────────────────
 * Helper: Fetch user or throw
 * ─────────────────────────────────────────────
 */
const getUserOrThrow = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);
  return user;
};

/**
 * ─────────────────────────────────────────────
 * Get profile
 * ─────────────────────────────────────────────
 */
const getProfile = async (userId: string) => {
  return await getUserOrThrow(userId);
};

/**
 * ─────────────────────────────────────────────
 * Update basic profile
 * ─────────────────────────────────────────────
 */
const updateProfile = async (userId: string, data: UpdateProfileInput) => {
  const updates = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(updates).length === 0) {
    throw new AppError("No valid fields provided for update", 400);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!user) throw new AppError("User not found", 404);

  return user;
};

/**
 * ─────────────────────────────────────────────
 * Update avatar (Cloudinary)
 * ─────────────────────────────────────────────
 */
const updateAvatar = async (userId: string, fileBuffer: Buffer) => {
  const user = await getUserOrThrow(userId);

  const oldAvatar = user.avatar;

  const { url } = await uploadToCloudinary(fileBuffer, "avatars", {
    width: 300,
    height: 300,
    quality: 80,
  });

  user.avatar = url;
  await user.save();

  // Safe cleanup AFTER successful update
  if (oldAvatar) {
    const oldPublicId = extractPublicId(oldAvatar);
    await deleteFromCloudinary(oldPublicId);
  }

  return user;
};

/**
 * ─────────────────────────────────────────────
 * Remove avatar
 * ─────────────────────────────────────────────
 */
const removeAvatar = async (userId: string) => {
  const user = await getUserOrThrow(userId);

  if (!user.avatar) {
    throw new AppError("No avatar to remove", 400);
  }

  const publicId = extractPublicId(user.avatar);
  await deleteFromCloudinary(publicId);

  user.avatar = undefined;
  await user.save();

  return user;
};

/**
 * ─────────────────────────────────────────────
 * Update expert profile (role protected)
 * ─────────────────────────────────────────────
 */
const updateExpertProfile = async (
  userId: string,
  data: UpdateExpertProfileInput
) => {
  const user = await getUserOrThrow(userId);

  if (user.role !== "EXPERT") {
    throw new AppError("Only experts can update expert profile fields", 403);
  }

  const updates = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(updates).length === 0) {
    throw new AppError("No valid fields provided for update", 400);
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  );

  return updatedUser!;
};

/**
 * ─────────────────────────────────────────────
 * Change password
 * ─────────────────────────────────────────────
 */
const changePassword = async (
  userId: string,
  data: ChangePasswordInput
) => {
  const user = await User.findById(userId).select("+password +refreshToken");
  if (!user) throw new AppError("User not found", 404);

  const isValid = await user.comparePassword(data.currentPassword);

  if (!isValid) {
    throw new AppError("Current password is incorrect", 401);
  }

  if (data.currentPassword === data.newPassword) {
    throw new AppError(
      "New password must be different from current password",
      400
    );
  }

  user.password = data.newPassword;
  user.refreshToken = undefined;

  await user.save();

  return {
    message: "Password updated successfully",
  };
};

/**
 * ─────────────────────────────────────────────
 * Export service
 * ─────────────────────────────────────────────
 */
const userService = {
  getProfile,
  updateProfile,
  updateAvatar,
  removeAvatar,
  updateExpertProfile,
  changePassword,
};

export default userService;