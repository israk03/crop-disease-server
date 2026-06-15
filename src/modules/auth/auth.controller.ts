import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import authService from "./auth.service.js";

import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

import { ValidatedRequest } from "../../middlewares/validate.middleware.js";

import {
  LoginInput,
  RegisterInput,
} from "./auth.validation.js";

// ─────────────────────────────────────────────────────────
// COOKIE CONFIG
// ─────────────────────────────────────────────────────────

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

// ─────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────

const register = catchAsync(
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const payload = req.validated as RegisterInput;
    const {
      user,
      accessToken,
      refreshToken,
    } = await authService.register(
      payload
    );

    res.cookie("accessToken", accessToken, {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 15 * 60 * 1000,
  path: "/",
});

    sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Registration successful",
      data: {
        user,
        accessToken,
      },
    });
  }
);

// ─────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────

const login = catchAsync(
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const payload = req.validated as LoginInput;
    const {
      user,
      accessToken,
      refreshToken,
    } = await authService.login(
      payload
    );

    res.cookie("accessToken", accessToken, {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 15 * 60 * 1000,
  path: "/",
});

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Login successful",
      data: {
        user,
        accessToken,
      },
    });
  }
);

// ─────────────────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────────────────

const refreshToken = catchAsync(
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const token =
      req.cookies?.refreshToken ??
      req.body?.refreshToken;

    if (!token) {
      throw new AppError(
        "Refresh token not provided",
        StatusCodes.UNAUTHORIZED
      );
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
    } =
      await authService.refreshAccessToken(
        token
      );

    res.cookie("accessToken", accessToken, {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 15 * 60 * 1000,
  path: "/",
});

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message:
        "Token refreshed successfully",
      data: {
        accessToken,
      },
    });
  }
);

// ─────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────

const logout = catchAsync(
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    await authService.logout(
      req.user!.id
    );

   
    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message:
        "Logged out successfully",
    });
  }
);

// ─────────────────────────────────────────────────────────
// GET CURRENT USER
// ─────────────────────────────────────────────────────────

const getMe = catchAsync(
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const user =
      await authService.getMe(
        req.user!.id
      );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message:
        "User profile retrieved",
      data: {
        user,
      },
    });
  }
);

// ─────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────

const authController = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
};

export default authController;