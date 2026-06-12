import mongoose from "mongoose";
import Post from "../../models/post.model.js";
import User from "../../models/user.model.js";
import AppError from "../../utils/AppError.js";

import { uploadToCloudinary } from "../../services/upload.service.js";

// ✅ NOTIFICATION
import { notifyPostUpvote } from "../../services/notification.service.js";

import {
  CreatePostInput,
  UpdatePostInput,
  PostQueryInput,
} from "./forum.validation.js";

// ─────────────────────────────────────────────
// CREATE POST
// ─────────────────────────────────────────────

const createPost = async (
  authorId: string,
  data: CreatePostInput,
  files?: Express.Multer.File[]
) => {
  const imageUrls: string[] = [];

  if (files && files.length > 0) {
    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file.buffer, "forum-images", { quality: 85 })
    );

    const uploadResults = await Promise.all(uploadPromises);
    imageUrls.push(...uploadResults.map((r) => r.url));
  }

  const post = await Post.create({
    author: authorId,
    title: data.title,
    description: data.description,
    tags: data.tags,
    cropType: data.cropType,
    postType: data.postType,
    linkedDetection: data.linkedDetection || null,
    images: imageUrls,
  });

  return post;
};

// ─────────────────────────────────────────────
// GET POSTS
// ─────────────────────────────────────────────

const getPosts = async (query: PostQueryInput) => {
  const { search, cropType, tag, page, limit, sortBy } = query;
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = { isActive: true };

  if (search) {
    filter.$text = { $search: search };
  }

  if (cropType) filter.cropType = cropType;
  if (tag) filter.tags = tag;

  const sortOptions: Record<string, any> = {
    newest: { createdAt: -1 },
    upvotes: { upvoteCount: -1, createdAt: -1 },
    trending: { trendingScore: -1, createdAt: -1 },
  };

  const sort = sortOptions[sortBy] ?? sortOptions.newest;

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("author", "name avatar role")
      .select("-upvotes")
      .lean(),

    Post.countDocuments(filter),
  ]);

  return {
    posts,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─────────────────────────────────────────────
// TRENDING POSTS
// ─────────────────────────────────────────────

const getTrendingPosts = async (limit = 10) => {
  return Post.find({ isActive: true })
    .sort({ trendingScore: -1, createdAt: -1 })
    .limit(limit)
    .populate("author", "name avatar role")
    .select("-upvotes")
    .lean();
};

// ─────────────────────────────────────────────
// GET POST BY ID
// ─────────────────────────────────────────────

const getPostById = async (postId: string, requesterId?: string) => {
  const post = await Post.findById(postId)
    .populate("author", "name avatar role specializations")
    .populate("linkedDetection", "cropType aiResult.diseaseName imageUrl");

  if (!post || !post.isActive) {
    throw new AppError("Post not found", 404);
  }

  const hasUpvoted = requesterId
    ? post.upvotes.some((id) => id.toString() === requesterId)
    : false;

  const postObj = post.toObject();
  const { upvotes, ...cleanPost } = postObj;

  return {
    ...cleanPost,
    hasUpvoted,
  };
};

// ─────────────────────────────────────────────
// UPDATE POST
// ─────────────────────────────────────────────

const updatePost = async (
  postId: string,
  authorId: string,
  data: UpdatePostInput
) => {
  const post = await Post.findById(postId);

  if (!post || !post.isActive) {
    throw new AppError("Post not found", 404);
  }

  if (post.author.toString() !== authorId) {
    throw new AppError("You can only edit your own posts", 403);
  }

  const updates: Record<string, any> = {};

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.tags !== undefined) updates.tags = data.tags;
  if (data.cropType !== undefined) updates.cropType = data.cropType;
  if (data.postType !== undefined) updates.postType = data.postType;

  updates.isEdited = true;
  updates.editedAt = new Date();

  const updatedPost = await Post.findByIdAndUpdate(
    postId,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!updatedPost) {
    throw new AppError("Post not found", 404);
  }

  return updatedPost;
};

// ─────────────────────────────────────────────
// DELETE POST (SOFT DELETE)
// ─────────────────────────────────────────────

const deletePost = async (
  postId: string,
  requesterId: string,
  requesterRole: string
) => {
  const post = await Post.findById(postId);

  if (!post || !post.isActive) {
    throw new AppError("Post not found", 404);
  }

  const isOwner = post.author.toString() === requesterId;
  const isAdmin = requesterRole === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new AppError(
      "You do not have permission to delete this post",
      403
    );
  }

  await Post.findByIdAndUpdate(postId, { isActive: false });
};

// ─────────────────────────────────────────────
// TOGGLE UPVOTE (WITH NOTIFICATION)
// ─────────────────────────────────────────────

const toggleUpvote = async (postId: string, userId: string) => {
  const post = await Post.findById(postId);

  if (!post || !post.isActive) {
    throw new AppError("Post not found", 404);
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const hasUpvoted = post.upvotes.some((id) =>
    id.equals(userObjectId)
  );

  if (hasUpvoted) {
    await Post.findByIdAndUpdate(postId, {
      $pull: { upvotes: userObjectId },
      $inc: { upvoteCount: -1 },
    });

    return {
      upvoted: false,
      upvoteCount: post.upvoteCount - 1,
    };
  } else {
    await Post.findByIdAndUpdate(postId, {
      $addToSet: { upvotes: userObjectId },
      $inc: { upvoteCount: 1 },
    });

    // ─────────────────────────────────────────────
    // ✅ NOTIFICATION LOGIC
    // ─────────────────────────────────────────────

    if (post.author.toString() !== userId) {
      const voter = await User.findById(userId).select("name");

      await notifyPostUpvote(
        post.author.toString(),
        postId,
        voter?.name ?? "Someone"
      );
    }

    return {
      upvoted: true,
      upvoteCount: post.upvoteCount + 1,
    };
  }
};

// ─────────────────────────────────────────────
// TRENDING SCORE RECALCULATION
// ─────────────────────────────────────────────

export const recalculateTrendingScores = async () => {
  const posts = await Post.find({ isActive: true }).select(
    "upvoteCount commentCount createdAt"
  );

  const updates = posts.map((post) => {
    const ageInHours =
      (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);

    const score =
      (post.upvoteCount * 3 + post.commentCount) /
      Math.pow(ageInHours + 2, 1.5);

    return {
      updateOne: {
        filter: { _id: post._id },
        update: { $set: { trendingScore: score } },
      },
    };
  });

  if (updates.length > 0) {
    await Post.bulkWrite(updates);
  }

  console.log(`📊 Recalculated trending scores for ${posts.length} posts`);
};

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

const forumService = {
  createPost,
  getPosts,
  getTrendingPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleUpvote,
  recalculateTrendingScores,
};

export default forumService;