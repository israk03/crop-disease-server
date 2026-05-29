import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload as DefaultJwtPayload } from "jsonwebtoken";

import { env } from "../config/env.js";
import AppError from "../utils/AppError.js";
import { UserRole } from "../models/user.model.js";

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

interface AuthJwtPayload extends DefaultJwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

// ─────────────────────────────────────────────────────────
// PROTECT MIDDLEWARE
// ─────────────────────────────────────────────────────────

export const protect = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError(
        "Access token required",
        401
      );
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      env.JWT_ACCESS_SECRET
    ) as AuthJwtPayload;

    if (!decoded?.id || !decoded?.role) {
      throw new AppError(
        "Invalid token payload",
        401
      );
    }

    // Attach user to request (trusted after verification)
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// AUTHORIZE MIDDLEWARE
// ─────────────────────────────────────────────────────────

export const authorize =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new AppError(
          "Authentication required",
          401
        )
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "Forbidden: insufficient permissions",
          403
        )
      );
    }

    next();
  };
