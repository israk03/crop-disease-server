import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

import AppError from "../utils/AppError.js";
import { env } from "../config/env.js";

const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = "Internal server error";
  let details: unknown = undefined;

  // AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  }

  // Mongoose Validation Error
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation failed";

    details = Object.values(err.errors).map((error) => ({
      path: error.path,
      message: error.message,
    }));
  }

  // Duplicate Key Error
  else if (
    err instanceof mongoose.mongo.MongoServerError &&
    err.code === 11000
  ) {
    statusCode = 409;

    const field = Object.keys(err.keyValue)[0];

    message = `${field} already exists`;
  }

  // JWT Errors
  else if (
    err instanceof Error &&
    err.name === "JsonWebTokenError"
  ) {
    statusCode = 401;
    message = "Invalid token";
  }

  else if (
    err instanceof Error &&
    err.name === "TokenExpiredError"
  ) {
    statusCode = 401;
    message = "Token expired";
  }

  // Unknown Errors
  else if (err instanceof Error) {
    message = err.message;
  }

  // Logging
  console.error("💥 Error:", err);

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,

    ...(details !== undefined ? { details } : {}),

    ...(env.NODE_ENV === "development" &&
      err instanceof Error && {
        stack: err.stack,
      }),

    timestamp: new Date().toISOString(),
  });
};

export default errorMiddleware;