import bcrypt from "bcryptjs";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

import User, { IUser, UserDocument, UserRole, } from "../../models/user.model.js";

import AppError from "../../utils/AppError.js";

import { env } from "../../config/env.js";

import {
  LoginInput,
  RegisterInput,
} from "./auth.validation.js";

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

interface TokenPayload extends JwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthResponse {
  user: ReturnType<typeof sanitizeUser>;
  accessToken: string;
  refreshToken: string;
}

// ─────────────────────────────────────────────────────────
// JWT HELPERS
// ─────────────────────────────────────────────────────────

const generateTokenPayload = (
  user: UserDocument
): TokenPayload => ({
  id: user._id.toString(),
  email: user.email,
  role: user.role,
});

const generateAccessToken = (
  payload: TokenPayload
): string => {
  return jwt.sign(
    payload,
    env.JWT_ACCESS_SECRET,
    {
      expiresIn:
        env.JWT_ACCESS_EXPIRES_IN,
    } as SignOptions
  );
};

const generateRefreshToken = (
  payload: TokenPayload
): string => {
  return jwt.sign(
    payload,
    env.JWT_REFRESH_SECRET,
    {
      expiresIn:
        env.JWT_REFRESH_EXPIRES_IN,
    } as SignOptions
  );
};

// ─────────────────────────────────────────────────────────
// SECURITY HELPERS
// ─────────────────────────────────────────────────────────

const hashToken = async (
  token: string
): Promise<string> => {
  return bcrypt.hash(token, 12);
};

const compareToken = async (
  plainToken: string,
  hashedToken: string
): Promise<boolean> => {
  return bcrypt.compare(
    plainToken,
    hashedToken
  );
};

// ─────────────────────────────────────────────────────────
// USER SERIALIZER
// ─────────────────────────────────────────────────────────

const sanitizeUser = (user: UserDocument) => ({
  _id: user._id.toString(),

  name: user.name,
  email: user.email,

  phone: user.phone,
  avatar: user.avatar,
  location: user.location,

  role: user.role,

  isVerified: user.isVerified,

  createdAt: user.createdAt,
});

// ─────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────

const register = async (
  data: RegisterInput
): Promise<AuthResponse> => {
  const existingUser =
    await User.findOne({
      email: data.email,
    }).lean();

  if (existingUser) {
    throw new AppError(
      "Email already registered",
      409
    );
  }

  const user = await User.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    password: data.password,
    role: data.role,
  });

  const tokenPayload =
    generateTokenPayload(user);

  const accessToken =
    generateAccessToken(tokenPayload);

  const refreshToken =
    generateRefreshToken(tokenPayload);

  // Store HASHED refresh token

  user.refreshToken =
    await hashToken(refreshToken);

  await user.save({
    validateBeforeSave: false,
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

// ─────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────

const login = async (
  data: LoginInput
): Promise<AuthResponse> => {
  const user = await User.findOne({
    email: data.email,
  }).select("+password +refreshToken");

  if (!user) {
    throw new AppError(
      "Invalid email or password",
      401
    );
  }

  if (!user.isActive) {
    throw new AppError(
      "Account has been deactivated",
      403
    );
  }

  const isPasswordValid =
    await user.comparePassword(
      data.password
    );

  if (!isPasswordValid) {
    throw new AppError(
      "Invalid email or password",
      401
    );
  }

  const tokenPayload =
    generateTokenPayload(user);

  const accessToken =
    generateAccessToken(tokenPayload);

  const refreshToken =
    generateRefreshToken(tokenPayload);

  // Rotate refresh token

  user.refreshToken =
    await hashToken(refreshToken);

  user.lastLoginAt = new Date();

  await user.save({
    validateBeforeSave: false,
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

// ─────────────────────────────────────────────────────────
// REFRESH ACCESS TOKEN
// ─────────────────────────────────────────────────────────

const refreshAccessToken = async (
  token: string
) => {
  let decoded: TokenPayload;

  try {
    decoded = jwt.verify(
      token,
      env.JWT_REFRESH_SECRET
    ) as TokenPayload;
  } catch {
    throw new AppError(
      "Invalid or expired refresh token",
      401
    );
  }

  const user =
    await User.findById(
      decoded.id
    ).select("+refreshToken");

  if (
    !user ||
    !user.refreshToken
  ) {
    throw new AppError(
      "Refresh token is invalid or revoked",
      401
    );
  }

  const isTokenValid =
    await compareToken(
      token,
      user.refreshToken
    );

  if (!isTokenValid) {
    throw new AppError(
      "Refresh token is invalid or revoked",
      401
    );
  }

  const tokenPayload =
    generateTokenPayload(user);

  const newAccessToken =
    generateAccessToken(tokenPayload);

  const newRefreshToken =
    generateRefreshToken(tokenPayload);

  // Rotate refresh token again

  user.refreshToken =
    await hashToken(newRefreshToken);

  await user.save({
    validateBeforeSave: false,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

// ─────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────

const logout = async (
  userId: string
): Promise<void> => {
  await User.findByIdAndUpdate(
    userId,
    {
      refreshToken: null,
    }
  );
};

// ─────────────────────────────────────────────────────────
// GET CURRENT USER
// ─────────────────────────────────────────────────────────

const getMe = async (
  userId: string
) => {
  const user =
    await User.findById(userId);

  if (!user) {
    throw new AppError(
      "User not found",
      404
    );
  }

  return sanitizeUser(user);
};

// ─────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────

const authService = {
  register,
  login,
  refreshAccessToken,
  logout,
  getMe,
};

export default authService;

