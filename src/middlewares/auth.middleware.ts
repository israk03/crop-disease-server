import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload as DefaultJwtPayload, JwtPayload } from "jsonwebtoken";

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

// Add to src/middlewares/auth.middleware.ts

// Optional protect — doesn't reject if no token, just skips user attachment
export const optionalProtect = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // No token — continue as guest
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch {
    next(); // Invalid token — continue as guest, don't reject
  }
};

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
