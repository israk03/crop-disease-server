import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

/**
 * Memory storage (required for Cloudinary buffer upload)
 */
const storage = multer.memoryStorage();

/**
 * Allowed image MIME types
 */
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * File filter with strict validation
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(null, true);
  }

  const error = new Error(
    "Invalid file type. Only JPG, PNG, and WEBP images are allowed."
  );

  return cb(error);
};

/**
 * Base multer instance
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

/**
 * Single image upload middleware
 */
export const uploadSingleImage = (fieldName: string) =>
  upload.single(fieldName);

/**
 * Multiple image upload middleware
 */
export const uploadMultipleImages = (fieldName: string, maxCount: number) =>
  upload.array(fieldName, maxCount);