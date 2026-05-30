import { Request, Response, NextFunction } from "express";
import multer from "multer";
import AppError from "../utils/AppError.js";

export const handleUploadErrors = (
  err: any,
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new AppError("File too large (max 5MB)", 400));
    }
  }

  if (err) {
    return next(new AppError(err.message || "File upload error", 400));
  }

  next();
};