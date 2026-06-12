import mongoose from "mongoose";
import User from "../../models/user.model.js";
import Detection from "../../models/detection.model.js";
import Consultation from "../../models/consultation.model.js";
import Post from "../../models/post.model.js";
import Alert from "../../models/alert.model.js";
import Farm from "../../models/farm.model.js";
import AppError from "../../utils/AppError.js";
import { notifyExpertApproved } from "../../services/notification.service.js";
import {
  UserListQueryInput,
  ChangeRoleInput,
  ChangeStatusInput,
  DetectionListQueryInput,
} from "./admin.validation.js";

const MAX_PAGE_SIZE = 100;

const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number
) => ({
  total,
  page,
  limit,
  totalPages: Math.max(
    1,
    Math.ceil(total / limit)
  ),
});

const ensureObjectId = (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid ID", 400);
  }
};


const normalizeDays = (
  days: number
) => {
  return Math.min(
    Math.max(days, 1),
    365
  );
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// ── Platform overview stats ───────────────────────────────────────────────────
// All queries run in parallel with Promise.all — one round trip worth of time

const getPlatformStats = async () => {
  const [
    totalUsers,
    totalFarmers,
    totalExperts,
    totalFarms,
    totalDetections,
    completedDetections,
    pendingDetections,
    totalConsultations,
    activeConsultations,
    completedConsultations,
    totalPosts,
    totalAlerts,
    activeAlerts,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "FARMER" }),
    User.countDocuments({ role: "EXPERT" }),
    Farm.countDocuments({ isActive: true }),
    Detection.countDocuments(),
    Detection.countDocuments({ status: "COMPLETED" }),
    Detection.countDocuments({ status: { $in: ["PENDING", "PROCESSING"] } }),
    Consultation.countDocuments(),
    Consultation.countDocuments({ status: { $in: ["ACCEPTED", "ACTIVE"] } }),
    Consultation.countDocuments({ status: "COMPLETED" }),
    Post.countDocuments({ isActive: true }),
    Alert.countDocuments(),
    Alert.countDocuments({ isActive: true }),
  ]);

  return {
    users: { total: totalUsers, farmers: totalFarmers, experts: totalExperts },
    farms: { total: totalFarms },
    detections: {
      total: totalDetections,
      completed: completedDetections,
      pending: pendingDetections,
      successRate:
        totalDetections > 0
          ? Math.round((completedDetections / totalDetections) * 100)
          : 0,
    },
    consultations: {
      total: totalConsultations,
      active: activeConsultations,
      completed: completedConsultations,
    },
    community: { totalPosts },
    alerts: { total: totalAlerts, active: activeAlerts },
  };
};

// ── Detection volume over time ────────────────────────────────────────────────
// Returns daily detection counts for the last N days
// Used to draw the line/bar chart on the dashboard

const getDetectionTrends = async (days: number) => {
    days = normalizeDays(days);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const trends = await Detection.aggregate([
    {
      // Stage 1: Only detections within the time window
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      // Stage 2: Group by calendar date
      // $dateToString converts a Date to "2026-05-01" string for grouping
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        total: { $sum: 1 },
        completed: {
          // $sum with condition — count only when status matches
          $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] },
        },
      },
    },
    {
      // Stage 3: Sort chronologically
      $sort: { _id: 1 },
    },
    {
      // Stage 4: Rename _id to date for cleaner output
      $project: {
        _id: 0,
        date: "$_id",
        total: 1,
        completed: 1,
        failed: 1,
      },
    },
  ]);

  return trends;
};

// ── Top diseases by detection frequency ──────────────────────────────────────
// Returns the most commonly detected diseases across the platform

const getDiseaseFrequency = async (days: number) => {
    days = normalizeDays(days);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const diseases = await Detection.aggregate([
    {
      // Stage 1: Only completed detections with a real disease (not healthy)
      $match: {
        status: "COMPLETED",
        createdAt: { $gte: startDate },
        "aiResult.isHealthy": false,
        "aiResult.diseaseName": { $exists: true, $ne: null },
      },
    },
    {
      // Stage 2: Group by disease name — count and track severity
      $group: {
        _id: "$aiResult.diseaseName",
        count: { $sum: 1 },
        avgConfidence: { $avg: "$aiResult.confidenceScore" },
        // Count each severity level
        lowCount: {
          $sum: {
            $cond: [{ $eq: ["$aiResult.severityLevel", "LOW"] }, 1, 0],
          },
        },
        mediumCount: {
          $sum: {
            $cond: [{ $eq: ["$aiResult.severityLevel", "MEDIUM"] }, 1, 0],
          },
        },
        highCount: {
          $sum: {
            $cond: [{ $eq: ["$aiResult.severityLevel", "HIGH"] }, 1, 0],
          },
        },
        criticalCount: {
          $sum: {
            $cond: [{ $eq: ["$aiResult.severityLevel", "CRITICAL"] }, 1, 0],
          },
        },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: 10, // Top 10 diseases
    },
    {
      $project: {
        _id: 0,
        diseaseName: "$_id",
        count: 1,
        avgConfidence: { $round: ["$avgConfidence", 1] },
        severityBreakdown: {
          low: "$lowCount",
          medium: "$mediumCount",
          high: "$highCount",
          critical: "$criticalCount",
        },
      },
    },
  ]);

  return diseases;
};

// ── Regional outbreak distribution ───────────────────────────────────────────
// Shows which regions have the most disease detections
// Joins detections with farms to get region data

const getRegionalDistribution = async (days: number) => {
    days = normalizeDays(days);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const regional = await Detection.aggregate([
    {
      // Stage 1: Completed detections with diseases, linked to a farm
      $match: {
        status: "COMPLETED",
        createdAt: { $gte: startDate },
        "aiResult.isHealthy": false,
        farm: { $exists: true, $ne: null },
      },
    },
    {
      // Stage 2: Join with farms collection to get region
      $lookup: {
        from: "farms",
        localField: "farm",
        foreignField: "_id",
        as: "farmData",
      },
    },
    {
      // Stage 3: Only keep detections where farm was found
      $match: { "farmData.0": { $exists: true } },
    },
    {
      // Stage 4: Group by region
      $group: {
        _id: { $arrayElemAt: ["$farmData.region", 0] },
        detectionCount: { $sum: 1 },
        uniqueDiseases: { $addToSet: "$aiResult.diseaseName" },
        affectedFarms: { $addToSet: "$farm" },
      },
    },
    {
      $sort: { detectionCount: -1 },
    },
    {
      $project: {
        _id: 0,
        region: "$_id",
        detectionCount: 1,
        uniqueDiseaseCount: { $size: "$uniqueDiseases" },
        affectedFarmCount: { $size: "$affectedFarms" },
      },
    },
  ]);

  return regional;
};

// ── Consultation statistics ───────────────────────────────────────────────────

const getConsultationStats = async (days: number) => {
    days = normalizeDays(days);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [statusBreakdown, topExperts, responseTimeStats] =
    await Promise.all([
      // Status breakdown
      Consultation.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            status: "$_id",
            count: 1,
          },
        },
      ]),

      // Top experts
      Consultation.aggregate([
        {
          $match: {
            status: "COMPLETED",
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: "$expert",
            consultationCount: { $sum: 1 },
            avgRating: { $avg: "$rating" },
          },
        },
        {
          $sort: {
            consultationCount: -1,
          },
        },
        {
          $limit: 5,
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "expertData",
          },
        },
        {
          $project: {
            _id: 0,
            consultationCount: 1,
            avgRating: {
              $round: ["$avgRating", 1],
            },
            expert: {
              id: {
                $arrayElemAt: ["$expertData._id", 0],
              },
              name: {
                $arrayElemAt: ["$expertData.name", 0],
              },
              avatar: {
                $arrayElemAt: ["$expertData.avatar", 0],
              },
            },
          },
        },
      ]),

      // Response time statistics
      Consultation.aggregate([
        {
          $match: {
            status: {
              $in: ["ACCEPTED", "ACTIVE", "COMPLETED"],
            },
            acceptedAt: {
              $exists: true,
              $ne: null,
            },
            createdAt: {
              $gte: startDate,
            },
          },
        },
        {
          $project: {
            responseTimeHours: {
              $divide: [
                {
                  $subtract: ["$acceptedAt", "$createdAt"],
                },
                1000 * 60 * 60,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgResponseTimeHours: {
              $avg: "$responseTimeHours",
            },
            minResponseTimeHours: {
              $min: "$responseTimeHours",
            },
            maxResponseTimeHours: {
              $max: "$responseTimeHours",
            },
          },
        },
        {
          $project: {
            _id: 0,
            avgResponseTimeHours: {
              $round: ["$avgResponseTimeHours", 1],
            },
            minResponseTimeHours: {
              $round: ["$minResponseTimeHours", 1],
            },
            maxResponseTimeHours: {
              $round: ["$maxResponseTimeHours", 1],
            },
          },
        },
      ]),
    ]);

  return {
    statusBreakdown,
    topExperts,
    responseTime: responseTimeStats[0] ?? null,
  };
};

// ── Community activity stats ──────────────────────────────────────────────────

const getCommunityStats = async (days: number) => {
    days = normalizeDays(days);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [topCropTypes, userGrowth] = await Promise.all([
    // Most active crop types
    Post.aggregate([
      {
        $match: {
          isActive: true,
          createdAt: {
            $gte: startDate,
          },
          cropType: {
            $exists: true,
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: "$cropType",
          postCount: {
            $sum: 1,
          },
          totalUpvotes: {
            $sum: "$upvoteCount",
          },
        },
      },
      {
        $sort: {
          postCount: -1,
        },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          _id: 0,
          cropType: "$_id",
          postCount: 1,
          totalUpvotes: 1,
        },
      },
    ]),

    // User growth
    User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
          },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            role: "$role",
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          "_id.date": 1,
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id.date",
          role: "$_id.role",
          count: 1,
        },
      },
    ]),
  ]);

  return {
    topCropTypes,
    userGrowth,
  };
};

// ── User management ───────────────────────────────────────────────────────────

const getUsers = async (query: UserListQueryInput) => {
  const { search, role, isActive, page, limit } = query;
  const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
const skip = (page - 1) * safeLimit;

  const filter: Record<string, any> = {};

  if (search) {
    const searchRegex = new RegExp(
  escapeRegex(search),
  "i"
);

filter.$or = [
  { name: searchRegex },
  { email: searchRegex },
];
  }

  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive;

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .select("-password -refreshToken"),
    User.countDocuments(filter),
  ]);

  return {
    users,
    meta: buildPaginationMeta(
  total,
  page,
  safeLimit
)
  };
};

const getUserById = async (userId: string) => {
    ensureObjectId(userId);
  const user = await User.findById(userId).select("-password -refreshToken");
  if (!user) throw new AppError("User not found", 404);

  // Enrich with activity stats
  const [detectionCount, farmCount, consultationCount, postCount] =
    await Promise.all([
      Detection.countDocuments({ owner: userId }),
      Farm.countDocuments({ owner: userId, isActive: true }),
      Consultation.countDocuments({
        $or: [{ farmer: userId }, { expert: userId }],
      }),
      Post.countDocuments({ author: userId, isActive: true }),
    ]);

  return {
    user,
    activity: { detectionCount, farmCount, consultationCount, postCount },
  };
};

const changeUserRole = async (userId: string, data: ChangeRoleInput) => {
    ensureObjectId(userId);
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);
    if (user.role === "ADMIN") {
  throw new AppError(
    "Admin role cannot be changed",
    403
  );
}
  // Prevent admin from accidentally demoting themselves
  // In a real system you'd check there's at least one other admin
  user.role = data.role;
  await user.save({ validateBeforeSave: false });

  return user;
};

const changeUserStatus = async (
  userId: string,
  data: ChangeStatusInput
) => {
    ensureObjectId(userId);
    const existingUser = await User.findById(userId);

if (!existingUser) {
  throw new AppError("User not found", 404);
}

if (
  existingUser.role === "ADMIN" &&
  data.isActive === false
) {
  throw new AppError(
    "Admin accounts cannot be deactivated",
    403
  );
}
  const user = await User.findByIdAndUpdate(
    userId,
    { isActive: data.isActive },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) throw new AppError("User not found", 404);

  // If deactivating — invalidate all their sessions
  if (!data.isActive) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
  }


  return user;
};

const deleteUser = async (userId: string) => {
    ensureObjectId(userId);
    
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);
  if (user.role === "ADMIN") {
  throw new AppError(
    "Admin accounts cannot be deleted",
    403
  );
}

  // Soft delete — preserve historical data integrity
  // Hard delete would orphan detections, consultations, posts
  await User.findByIdAndUpdate(userId, {
    isActive: false,
    email: `deleted_${Date.now()}_${user.email}`, // Free up email for re-registration
    refreshToken: null,
  });
};

// ── Expert approval ───────────────────────────────────────────────────────────

const getPendingExperts = async () => {
  // Experts who registered but haven't been approved yet
  // In a fuller system you'd have an isApproved field
  // Here we treat EXPERT role + isVerified:false as "pending"
  const experts = await User.find({
    role: "EXPERT",
    isVerified: false,
    isActive: true,
  })
    .select("-password -refreshToken")
    .sort({ createdAt: -1 });

  return experts;
};

const approveExpert = async (expertId: string) => {
    ensureObjectId(expertId);
  const expert = await User.findOne({
    _id: expertId,
    role: "EXPERT",
  });

  if (!expert) throw new AppError("Expert not found", 404);
  if (expert.isVerified) throw new AppError("Expert is already approved", 409);

  expert.isVerified = true;
  await expert.save({ validateBeforeSave: false });

  // Notify the expert their account is approved
  await notifyExpertApproved(expertId);

  return expert;
};

const rejectExpert = async (expertId: string) => {
    ensureObjectId(expertId);
  const expert = await User.findOne({
    _id: expertId,
    role: "EXPERT",
    isVerified: false,
  });

  if (!expert) throw new AppError("Expert not found or already processed", 404);

  // Downgrade back to FARMER role on rejection
  expert.role = "FARMER";
  await expert.save({ validateBeforeSave: false });

  return expert;
};

// ── Admin detection monitor ───────────────────────────────────────────────────

const getAllDetections = async (query: DetectionListQueryInput) => {
  const { status, page, limit } = query;
  const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
const skip = (page - 1) * safeLimit;

  const filter: Record<string, any> = {};
  if (status) filter.status = status;

  const [detections, total] = await Promise.all([
    Detection.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("owner", "name email avatar")
      .select("-imagePublicId"),
    Detection.countDocuments(filter),
  ]);

  return {
    detections,
    meta: buildPaginationMeta(
  total,
  page,
  safeLimit
)
  };
};

// ── Admin alert monitor ───────────────────────────────────────────────────────

const getAllAlerts = async (
  page = 1,
  limit = 20
) => {
  const safeLimit = Math.min(
    limit,
    MAX_PAGE_SIZE
  );

  const skip = (page - 1) * safeLimit;

  const [alerts, total] =
    await Promise.all([
      Alert.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate(
          "createdBy",
          "name email"
        ),
      Alert.countDocuments(),
    ]);

  return {
    alerts,
    meta: buildPaginationMeta(
      total,
      page,
      safeLimit
    ),
  };
};

const adminService = {
  getPlatformStats,
  getDetectionTrends,
  getDiseaseFrequency,
  getRegionalDistribution,
  getConsultationStats,
  getCommunityStats,
  getUsers,
  getUserById,
  changeUserRole,
  changeUserStatus,
  deleteUser,
  getPendingExperts,
  approveExpert,
  rejectExpert,
  getAllDetections,
  getAllAlerts,
};

export default adminService;