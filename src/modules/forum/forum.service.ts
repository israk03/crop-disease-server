import mongoose from "mongoose";
import Post from "../../models/post.model.js";
import AppError from "../../utils/AppError.js";
import {
  uploadToCloudinary,
} from "../../services/upload.service.js";
import {
  CreatePostInput,
  UpdatePostInput,
  PostQueryInput,
} from "./forum.validation.js";

// ── Create post ───────────────────────────────────────────────────────────────

const createPost = async (
  authorId: string,
  data: CreatePostInput,
  files?: Express.Multer.File[]
) => {
  // Upload any attached images to Cloudinary
  const imageUrls: string[] = [];
  if (files && files.length > 0) {
    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file.buffer, "forum-images", { quality: 85 })
    );
    // Upload all images in parallel
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

// ── Get posts with filtering, search, and pagination ─────────────────────────

const getPosts = async (query: PostQueryInput) => {
  const { search, cropType, tag, page, limit, sortBy } = query;
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = { isActive: true };

  // Full-text search using MongoDB text index
  if (search) {
    filter.$text = { $search: search };
  }

  if (cropType) filter.cropType = cropType;
  if (tag) filter.tags = tag;

  // Sort strategy based on query param
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
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ── Get trending posts ────────────────────────────────────────────────────────

const getTrendingPosts = async (limit = 10) => {
  const posts = await Post.find({ isActive: true })
    .sort({ trendingScore: -1, createdAt: -1 })
    .limit(limit)
    .populate("author", "name avatar role")
    .select("-upvotes")
    .lean();

  return posts;
};

// ── Get single post ───────────────────────────────────────────────────────────

const getPostById = async (postId: string, requesterId?: string) => {
  const post = await Post.findById(postId)
    .populate("author", "name avatar role specializations")
    .populate("linkedDetection", "cropType aiResult.diseaseName imageUrl");

  if (!post || !post.isActive) throw new AppError("Post not found", 404);
  // If a logged-in user is viewing, tell them whether they've upvoted
  const hasUpvoted = requesterId
    ? post.upvotes.some((id) => id.toString() === requesterId)
    : false;

  // Remove the full upvotes array from the response — only send the boolean
  const postObj = post.toObject();
  const { upvotes, ...postWithoutUpvotes } = postObj;

  return { ...postWithoutUpvotes, hasUpvoted };
};

// ── Update post ───────────────────────────────────────────────────────────────

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

if (data.title !== undefined) {
  updates.title = data.title;
}

if (data.description !== undefined) {
  updates.description = data.description;
}

if (data.tags !== undefined) {
  updates.tags = data.tags;
}

if (data.cropType !== undefined) {
  updates.cropType = data.cropType;
}

if (data.postType !== undefined) {
  updates.postType = data.postType;
}

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

  return updatedPost!;
};

// ── Delete post (soft delete) ─────────────────────────────────────────────────

const deletePost = async (
  postId: string,
  requesterId: string,
  requesterRole: string
) => {
  const post = await Post.findById(postId);
  if (!post || !post.isActive) {
  throw new AppError("Post not found", 404);
}

  // Both the author AND admin can delete a post
  const isOwner = post.author.toString() === requesterId;
  const isAdmin = requesterRole === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new AppError("You do not have permission to delete this post", 403);
  }

  // Soft delete — comments remain but won't be shown
  await Post.findByIdAndUpdate(postId, { isActive: false });
};

// ── Toggle upvote ─────────────────────────────────────────────────────────────

const toggleUpvote = async (postId: string, userId: string) => {
  const post = await Post.findById(postId);
  if (!post || !post.isActive) {
  throw new AppError("Post not found", 404);
}

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const hasUpvoted = post.upvotes.some((id) => id.equals(userObjectId));

  if (hasUpvoted) {
    // Remove upvote
    await Post.findByIdAndUpdate(postId, {
      $pull: { upvotes: userObjectId },
      $inc: { upvoteCount: -1 },
    });
    return { upvoted: false, upvoteCount: post.upvoteCount - 1 };
  } else {
    // Add upvote
    await Post.findByIdAndUpdate(postId, {
      $addToSet: { upvotes: userObjectId }, // $addToSet prevents duplicates
      $inc: { upvoteCount: 1 },
    });
    return { upvoted: true, upvoteCount: post.upvoteCount + 1 };
  }
};

// ── Recalculate trending score ────────────────────────────────────────────────
// Called by a cron job in Phase 11
// Formula: upvotes weighted + recent comments + recency decay
export const recalculateTrendingScores = async () => {
  const posts = await Post.find({ isActive: true }).select(
    "upvoteCount commentCount createdAt"
  );

  const updates = posts.map((post) => {
    const ageInHours =
      (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);

    // Wilson score-inspired formula used by Reddit/HN
    // Higher upvotes = higher score, but score decays as post gets older
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

  // bulkWrite — one DB round trip for all updates
  if (updates.length > 0) {
    await Post.bulkWrite(updates);
  }

  console.log(`📊 Recalculated trending scores for ${posts.length} posts`);
};

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