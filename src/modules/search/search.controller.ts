import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import searchService from "./search.service.js";
import sendResponse from "../../utils/sendResponse.js";
import AppError from "../../utils/AppError.js";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const toInt = (v: any, d = 1) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

const toFloat = (v: any) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
};

// ─────────────────────────────────────────────────────────────
// Unified search
// ─────────────────────────────────────────────────────────────

const unifiedSearch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      q,
      type = "all",
      page = "1",
      limit = "10",
      cropType,
      region,
      severity,
      status,
      minRating,
    } = req.query as any;

    const allowed = ["all", "posts", "experts", "detections", "farms", "alerts"];

    if (!allowed.includes(type)) {
      throw new AppError("Invalid search type", 400);
    }

    const data = await searchService.search(
      {
        q,
        type,
        page: toInt(page),
        limit: Math.min(toInt(limit), 20),
        cropType,
        region,
        severity,
        status,
        minRating: toFloat(minRating),
      },
      req.user?.id,
      req.user?.role
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: `Search completed for "${q}"`,
      data,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// Experts
// ─────────────────────────────────────────────────────────────

const searchExperts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, specialization, minRating, page = "1", limit = "10" } =
      req.query as any;

    const result = await searchService.findExperts({
      query: q,
      specialization,
      minRating: toFloat(minRating),
      page: toInt(page),
      limit: toInt(limit),
    });

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Experts retrieved",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// Posts
// ─────────────────────────────────────────────────────────────

const searchPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, cropType, tag, sortBy = "newest", page = "1", limit = "10" } =
      req.query as any;

    const result = await searchService.findPosts({
      query: q,
      cropType,
      tag,
      sortBy,
      page: toInt(page),
      limit: toInt(limit),
    });

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Posts retrieved",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// Detections
// ─────────────────────────────────────────────────────────────

const searchDetections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      q,
      status,
      severity,
      cropType,
      dateFrom,
      dateTo,
      page = "1",
      limit = "10",
    } = req.query as any;

    const result = await searchService.findDetections(req.user!.id, {
      query: q,
      status,
      severity,
      cropType,
      dateFrom,
      dateTo,
      page: toInt(page),
      limit: toInt(limit),
    });

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Detections retrieved",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  unifiedSearch,
  searchExperts,
  searchPosts,
  searchDetections,
};