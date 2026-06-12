import Post from "../../models/post.model.js";
import User from "../../models/user.model.js";
import Detection from "../../models/detection.model.js";
import Farm from "../../models/farm.model.js";
import Alert from "../../models/alert.model.js";
import AppError from "../../utils/AppError.js";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

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

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const buildRegex = (value?: string) =>
  value ? new RegExp(value.trim(), "i") : undefined;

const safeTextSearch = (q: string) => {
  const trimmed = q.trim();
  return trimmed.length ? { $text: { $search: trimmed } } : {};
};

// ─────────────────────────────────────────────────────────────
// Posts
// ─────────────────────────────────────────────────────────────

const searchPosts = async (
  query: string,
  options: { skip: number; limit: number; cropType?: string }
) => {
  const filter: any = {
    isActive: true,
    ...safeTextSearch(query),
  };

  const cropRegex = buildRegex(options.cropType);
  if (cropRegex) filter.cropType = cropRegex;

  const [items, total] = await Promise.all([
    Post.find(filter, {
      score: { $meta: "textScore" },
    })
      .sort({ score: { $meta: "textScore" } })
      .skip(options.skip)
      .limit(options.limit)
      .populate("author", "name avatar role")
      .select("title description cropType tags upvoteCount commentCount createdAt"),

    Post.countDocuments(filter),
  ]);

  return { items, total };
};

// ─────────────────────────────────────────────────────────────
// Experts
// ─────────────────────────────────────────────────────────────

const searchExperts = async (
  query: string,
  options: {
    skip: number;
    limit: number;
    minRating?: number;
    specialization?: string;
  }
) => {
  const filter: any = {
    role: "EXPERT",
    isActive: true,
    isVerified: true,
    $or: [
      { name: buildRegex(query) },
      { bio: buildRegex(query) },
      { specializations: buildRegex(query) },
    ],
  };

  if (options.minRating !== undefined) {
    filter.rating = { $gte: options.minRating };
  }

  if (options.specialization) {
    filter.specializations = buildRegex(options.specialization);
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ rating: -1, consultationCount: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .select("name avatar bio specializations rating consultationCount location"),

    User.countDocuments(filter),
  ]);

  return { items, total };
};

// ─────────────────────────────────────────────────────────────
// Detections (user-scoped)
// ─────────────────────────────────────────────────────────────

const searchDetections = async (
  query: string,
  ownerId: string,
  options: {
    skip: number;
    limit: number;
    status?: string;
    severity?: string;
  }
) => {
  const filter: any = {
    owner: ownerId,
    $or: [
      { cropType: buildRegex(query) },
      { "aiResult.diseaseName": buildRegex(query) },
    ],
  };

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

// ─────────────────────────────────────────────────────────────
// Farms
// ─────────────────────────────────────────────────────────────

const searchFarms = async (
  query: string,
  options: { skip: number; limit: number; region?: string }
) => {
  const filter: any = {
    isActive: true,
    $or: [
      { name: buildRegex(query) },
      { region: buildRegex(query) },
      { address: buildRegex(query) },
    ],
  };

  if (options.region) filter.region = buildRegex(options.region);

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

// ─────────────────────────────────────────────────────────────
// Alerts
// ─────────────────────────────────────────────────────────────

const searchAlerts = async (
  query: string,
  options: { skip: number; limit: number; region?: string; cropType?: string }
) => {
  const filter: any = {
    isActive: true,
    expiresAt: { $gt: new Date() },
    $or: [
      { diseaseName: buildRegex(query) },
      { region: buildRegex(query) },
      { cropType: buildRegex(query) },
      { description: buildRegex(query) },
    ],
  };

  if (options.region) filter.region = buildRegex(options.region);
  if (options.cropType) filter.cropType = buildRegex(options.cropType);

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

// ─────────────────────────────────────────────────────────────
// Unified search
// ─────────────────────────────────────────────────────────────

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

  const query = q?.trim();
  if (!query || query.length < 2) {
    throw new AppError("Search query must be at least 2 characters", 400);
  }

  const safePage = Math.max(page || 1, 1);
  const safeLimit = Math.min(Math.max(limit || 10, 1), 20);
  const skip = (safePage - 1) * safeLimit;

  const results: any = {};
  let totalResults = 0;

  const runAll = type === "all";

  const tasks: Promise<void>[] = [];

  if (runAll || type === "posts") {
    tasks.push(
      searchPosts(query, { skip, limit: safeLimit, cropType }).then((r) => {
        results.posts = r;
        totalResults += r.total;
      })
    );
  }

  if (runAll || type === "experts") {
    tasks.push(
      searchExperts(query, {
        skip,
        limit: safeLimit,
        minRating,
      }).then((r) => {
        results.experts = r;
        totalResults += r.total;
      })
    );
  }

  if (
    (runAll || type === "detections") &&
    requesterId &&
    requesterRole === "FARMER"
  ) {
    tasks.push(
      searchDetections(query, requesterId, {
        skip,
        limit: safeLimit,
        status,
        severity,
      }).then((r) => {
        results.detections = r;
        totalResults += r.total;
      })
    );
  }

  if (runAll || type === "farms") {
    tasks.push(
      searchFarms(query, { skip, limit: safeLimit, region }).then((r) => {
        results.farms = r;
        totalResults += r.total;
      })
    );
  }

  if (runAll || type === "alerts") {
    tasks.push(
      searchAlerts(query, {
        skip,
        limit: safeLimit,
        region,
        cropType,
      }).then((r) => {
        results.alerts = r;
        totalResults += r.total;
      })
    );
  }

  await Promise.all(tasks);

  return {
    query,
    type,
    results,
    meta: {
      page: safePage,
      limit: safeLimit,
      totalResults,
    },
  };
};

// ─────────────────────────────────────────────────────────────
// Focused APIs
// ─────────────────────────────────────────────────────────────

export const findExperts = async (options: any) => {
  const { query, specialization, minRating, page, limit } = options;

  const safePage = Math.max(page || 1, 1);
  const safeLimit = Math.min(Math.max(limit || 10, 1), 50);
  const skip = (safePage - 1) * safeLimit;

  const filter: any = {
    role: "EXPERT",
    isActive: true,
    isVerified: true,
  };

  if (query) {
    filter.$or = [
      { name: buildRegex(query) },
      { bio: buildRegex(query) },
      { specializations: buildRegex(query) },
    ];
  }

  if (specialization) filter.specializations = buildRegex(specialization);
  if (minRating !== undefined) filter.rating = { $gte: minRating };

  const [experts, total] = await Promise.all([
    User.find(filter)
      .sort({ rating: -1, consultationCount: -1 })
      .skip(skip)
      .limit(safeLimit),

    User.countDocuments(filter),
  ]);

  return {
    experts,
    meta: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const findPosts = async (options: any) => {
  const { query, cropType, tag, sortBy = "newest", page, limit } = options;

  const safePage = Math.max(page || 1, 1);
  const safeLimit = Math.min(Math.max(limit || 10, 1), 50);
  const skip = (safePage - 1) * safeLimit;

  const filter: any = { isActive: true };

  if (query) filter.$text = { $search: query };
  if (cropType) filter.cropType = buildRegex(cropType);
  if (tag) filter.tags = tag;

  const sortMap: any = {
    newest: { createdAt: -1 },
    upvotes: { upvoteCount: -1 },
    trending: { trendingScore: -1 },
  };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort(sortMap[sortBy])
      .skip(skip)
      .limit(safeLimit)
      .populate("author", "name avatar role"),

    Post.countDocuments(filter),
  ]);

  return {
    posts,
    meta: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const findDetections = async (ownerId: string, options: any) => {
  const { query, status, severity, cropType, dateFrom, dateTo, page, limit } =
    options;

  const safePage = Math.max(page || 1, 1);
  const safeLimit = Math.min(Math.max(limit || 10, 1), 50);
  const skip = (safePage - 1) * safeLimit;

  const filter: any = { owner: ownerId };

  if (query) {
    filter.$or = [
      { cropType: buildRegex(query) },
      { "aiResult.diseaseName": buildRegex(query) },
    ];
  }

  if (status) filter.status = status;
  if (cropType) filter.cropType = buildRegex(cropType);
  if (severity) filter["aiResult.severityLevel"] = severity.toUpperCase();

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const [detections, total] = await Promise.all([
    Detection.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),

    Detection.countDocuments(filter),
  ]);

  return {
    detections,
    meta: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

// ─────────────────────────────────────────────────────────────

const searchService = {
  search,
  findExperts,
  findPosts,
  findDetections,
};

export default searchService;