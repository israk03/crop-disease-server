import Post from "../../models/post.model.js";
import User from "../../models/user.model.js";
import Detection from "../../models/detection.model.js";
import Farm from "../../models/farm.model.js";
import Alert from "../../models/alert.model.js";
import AppError from "../../utils/AppError.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SearchType =
  | "all"
  | "posts"
  | "experts"
  | "detections"
  | "farms"
  | "alerts";

export interface SearchQuery {
  q: string;
  type: SearchType;
  page: number;
  limit: number;
  cropType?: string;
  region?: string;
  severity?: string;
  status?: string;
  minRating?: number;
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toRegex = (value?: string) =>
  value ? new RegExp(escapeRegex(value), "i") : undefined;

// ── POSTS ─────────────────────────────────────────────────────────────────────

const searchPosts = async (
  query: string,
  options: { skip: number; limit: number; cropType?: string }
) => {
  const filter: Record<string, any> = {
    isActive: true,
  };

  const searchRegex = toRegex(query);

  filter.$or = searchRegex
    ? [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
      ]
    : [];

  if (options.cropType) {
    filter.cropType = new RegExp(escapeRegex(options.cropType), "i");
  }

  const [items, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .populate("author", "name avatar role")
      .select(
        "title description cropType tags upvoteCount commentCount createdAt"
      ),
    Post.countDocuments(filter),
  ]);

  return { items, total };
};

// ── EXPERTS ───────────────────────────────────────────────────────────────────

const searchExperts = async (
  query: string,
  options: { skip: number; limit: number; minRating?: number }
) => {
  const searchRegex = toRegex(query);

  const filter: Record<string, any> = {
    role: "EXPERT",
    isActive: true,
    isVerified: true,
  };

  if (searchRegex) {
    filter.$or = [
      { name: searchRegex },
      { bio: searchRegex },
      { specializations: searchRegex },
    ];
  }

  if (options.minRating !== undefined) {
    filter.rating = { $gte: options.minRating };
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ rating: -1, consultationCount: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .select(
        "name avatar bio specializations rating consultationCount location"
      ),
    User.countDocuments(filter),
  ]);

  return { items, total };
};

// ── DETECTIONS ────────────────────────────────────────────────────────────────

const searchDetections = async (
  query: string,
  ownerId: string,
  options: { skip: number; limit: number; status?: string; severity?: string }
) => {
  const searchRegex = toRegex(query);

  const filter: Record<string, any> = {
    owner: ownerId,
  };

  if (searchRegex) {
    filter.$or = [
      { cropType: searchRegex },
      { "aiResult.diseaseName": searchRegex },
    ];
  }

  if (options.status) filter.status = options.status;
  if (options.severity) {
    filter["aiResult.severityLevel"] = options.severity.toUpperCase();
  }

  const [items, total] = await Promise.all([
    Detection.find(filter)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .select(
        "cropType imageUrl status aiResult.diseaseName aiResult.severityLevel aiResult.confidenceScore createdAt"
      ),
    Detection.countDocuments(filter),
  ]);

  return { items, total };
};

// ── FARMS ─────────────────────────────────────────────────────────────────────

const searchFarms = async (
  query: string,
  options: { skip: number; limit: number; region?: string }
) => {
  const searchRegex = toRegex(query);

  const filter: Record<string, any> = {
    isActive: true,
  };

  if (searchRegex) {
    filter.$or = [
      { name: searchRegex },
      { region: searchRegex },
      { address: searchRegex },
    ];
  }

  if (options.region) {
    filter.region = new RegExp(escapeRegex(options.region), "i");
  }

  const [items, total] = await Promise.all([
    Farm.find(filter)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .populate("owner", "name avatar")
      .select("name region address size soilType createdAt"),
    Farm.countDocuments(filter),
  ]);

  return { items, total };
};

// ── ALERTS ───────────────────────────────────────────────────────────────────

const searchAlerts = async (
  query: string,
  options: { skip: number; limit: number; region?: string; cropType?: string }
) => {
  const searchRegex = toRegex(query);

  const filter: Record<string, any> = {
    isActive: true,
    expiresAt: { $gt: new Date() },
  };

  if (searchRegex) {
    filter.$or = [
      { diseaseName: searchRegex },
      { region: searchRegex },
      { cropType: searchRegex },
      { description: searchRegex },
    ];
  }

  if (options.region) filter.region = new RegExp(escapeRegex(options.region), "i");
  if (options.cropType) filter.cropType = new RegExp(escapeRegex(options.cropType), "i");

  const [items, total] = await Promise.all([
    Alert.find(filter)
      .sort({ outbreakLevel: -1, createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .select(
        "diseaseName cropType region outbreakLevel description detectionCount createdAt"
      ),
    Alert.countDocuments(filter),
  ]);

  return { items, total };
};

// ── UNIFIED SEARCH ────────────────────────────────────────────────────────────

export const search = async (
  searchQuery: SearchQuery,
  requesterId?: string,
  requesterRole?: string
) => {
  const {
    q,
    type,
    page,
    limit,
    cropType,
    region,
    severity,
    status,
    minRating,
  } = searchQuery;

  if (!q || q.trim().length < 2) {
    throw new AppError("Search query must be at least 2 characters", 400);
  }

  const skip = (page - 1) * limit;

  const results: any = {};

  const tasks: Promise<any>[] = [];

  const isAll = type === "all";

  if (isAll || type === "posts") {
    tasks.push(
      searchPosts(q, { skip, limit, cropType }).then((r) => {
        results.posts = r;
      })
    );
  }

  if (isAll || type === "experts") {
    tasks.push(
      searchExperts(q, { skip, limit, minRating }).then((r) => {
        results.experts = r;
      })
    );
  }

  if (
    (isAll || type === "detections") &&
    requesterId &&
    requesterRole === "FARMER"
  ) {
    tasks.push(
      searchDetections(q, requesterId, {
        skip,
        limit,
        status,
        severity,
      }).then((r) => {
        results.detections = r;
      })
    );
  }

  if (isAll || type === "farms") {
    tasks.push(
      searchFarms(q, { skip, limit, region }).then((r) => {
        results.farms = r;
      })
    );
  }

  if (isAll || type === "alerts") {
    tasks.push(
      searchAlerts(q, { skip, limit, region, cropType }).then((r) => {
        results.alerts = r;
      })
    );
  }

  const resolved = await Promise.all(tasks);

  const totalResults = Object.values(results).reduce(
    (acc: number, r: any) => acc + (r?.total || 0),
    0
  );

  return {
    query: q,
    type,
    results,
    meta: {
      page,
      limit,
      totalResults,
    },
  };
};

// ── EXPORTED SERVICES ────────────────────────────────────────────────────────

export const findExperts = async (options: any) => {
  const skip = (options.page - 1) * options.limit;

  const filter: Record<string, any> = {
    role: "EXPERT",
    isActive: true,
    isVerified: true,
  };

  const searchRegex = toRegex(options.query);

  if (searchRegex) {
    filter.$or = [
      { name: searchRegex },
      { bio: searchRegex },
      { specializations: searchRegex },
    ];
  }

  if (options.specialization) {
    filter.specializations = new RegExp(escapeRegex(options.specialization), "i");
  }

  if (options.minRating !== undefined) {
    filter.rating = { $gte: options.minRating };
  }

  const [experts, total] = await Promise.all([
    User.find(filter)
      .sort({ rating: -1, consultationCount: -1 })
      .skip(skip)
      .limit(options.limit)
      .select(
        "name avatar bio specializations rating consultationCount location experience"
      ),
    User.countDocuments(filter),
  ]);

  return {
    experts,
    meta: { total, page: options.page, limit: options.limit },
  };
};

// ── EXPORTS ───────────────────────────────────────────────────────────────────

export default {
  search,
  findExperts,
};