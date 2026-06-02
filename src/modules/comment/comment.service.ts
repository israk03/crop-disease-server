import mongoose from "mongoose";
import Comment from "../../models/comment.model.js";
import Post from "../../models/post.model.js";
import User from "../../models/user.model.js";
import AppError from "../../utils/AppError.js";
import { CreateCommentInput, UpdateCommentInput } from "./comment.validation.js";

// ── Add comment or reply ──────────────────────────────────────────────────────

const addComment = async (
  postId: string,
  authorId: string,
  data: CreateCommentInput
) => {
  const post = await Post.findById(postId);

if (!post || !post.isActive) {
  throw new AppError("Post not found", 404);
}

  // If replying, verify parent comment exists and belongs to this post
  if (data.parentCommentId) {
    const parentComment = await Comment.findOne({
      _id: data.parentCommentId,
      post: postId,
      isActive: true,
    });
    if (!parentComment) {
      throw new AppError("Parent comment not found", 404);
    }
  }

  const author = await User.findById(authorId).select("role");

if (!author) {
  throw new AppError("User not found", 404);
}

const isExpertAnswer = author.role === "EXPERT";

  const comment = await Comment.create({
    post: postId,
    author: authorId,
    parentComment: data.parentCommentId || null,
    content: data.content,
    isExpertAnswer,
  });

  // Increment post comment count — same denormalization pattern as upvoteCount
  await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

  // Populate author info for the response
  await comment.populate("author", "name avatar role");

  return comment;
};

// ── Get comments for a post ───────────────────────────────────────────────────
// Returns flat list — frontend reconstructs the tree
// Sorted: accepted answer first, then expert answers, then by upvotes

const getComments = async (postId: string) => {
  const post = await Post.findById(postId);

if (!post || !post.isActive) {
  throw new AppError("Post not found", 404);
}

  const comments = await Comment.find({
  post: postId,
  isActive: true,
})
  .populate("author", "name avatar role specializations")
  .sort({
    isAcceptedAnswer: -1,
    isExpertAnswer: -1,
    upvoteCount: -1,
    createdAt: 1,
  })
  .lean();

  return comments;
};

// ── Edit comment ──────────────────────────────────────────────────────────────

const updateComment = async (
  commentId: string,
  authorId: string,
  data: UpdateCommentInput
) => {
 const comment = await Comment.findById(commentId);

if (!comment || !comment.isActive) {
  throw new AppError("Comment not found", 404);
}
  if (comment.author.toString() !== authorId) {
    throw new AppError("You can only edit your own comments", 403);
  }

  comment.content = data.content;
  await comment.save();

  return comment;
};

// ── Delete comment (soft delete) ──────────────────────────────────────────────

const deleteComment = async (
  commentId: string,
  requesterId: string,
  requesterRole: string
) => {
  const comment = await Comment.findById(commentId);

if (!comment || !comment.isActive) {
  throw new AppError("Comment not found", 404);
}

  const isOwner = comment.author.toString() === requesterId;
  const isAdmin = requesterRole === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new AppError("You do not have permission to delete this comment", 403);
  }

  await Comment.findByIdAndUpdate(commentId, { isActive: false });

  // Decrement post comment count
  await Post.findByIdAndUpdate(comment.post, { $inc: { commentCount: -1 } });
};

// ── Toggle comment upvote ─────────────────────────────────────────────────────

const toggleUpvote = async (commentId: string, userId: string) => {
  const comment = await Comment.findById(commentId);

if (!comment || !comment.isActive) {
  throw new AppError("Comment not found", 404);
}

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const hasUpvoted = comment.upvotes.some((id) => id.equals(userObjectId));

  if (hasUpvoted) {
    await Comment.findByIdAndUpdate(commentId, {
      $pull: { upvotes: userObjectId },
      $inc: { upvoteCount: -1 },
    });
    return { upvoted: false, upvoteCount: comment.upvoteCount - 1 };
  } else {
    await Comment.findByIdAndUpdate(commentId, {
      $addToSet: { upvotes: userObjectId },
      $inc: { upvoteCount: 1 },
    });
    return { upvoted: true, upvoteCount: comment.upvoteCount + 1 };
  }
};

// ── Mark accepted answer ──────────────────────────────────────────────────────
// Only the post author can mark an accepted answer

const markAcceptedAnswer = async (
  commentId: string,
  requesterId: string
) => {
  const comment = await Comment.findOne({
    _id: commentId,
    isActive: true,
  }).populate<{ post: { author: mongoose.Types.ObjectId; _id: mongoose.Types.ObjectId } }>(
    "post",
    "author"
  );

  if (!comment) throw new AppError("Comment not found", 404);

  // Verify requester is the post author
  if (comment.post.author.toString() !== requesterId) {
    throw new AppError("Only the post author can mark an accepted answer", 403);
  }

  // If this comment is already accepted, unmark it (toggle behavior)
  const isCurrentlyAccepted = comment.isAcceptedAnswer;

  // Clear any existing accepted answer on this post first
  await Comment.updateMany(
    { post: comment.post._id, isAcceptedAnswer: true },
    { $set: { isAcceptedAnswer: false } }
  );

  // Set the new accepted answer (unless toggling off)
  if (!isCurrentlyAccepted) {
    comment.isAcceptedAnswer = true;
    await comment.save();
  }

  return comment;
};

const commentService = {
  addComment,
  getComments,
  updateComment,
  deleteComment,
  toggleUpvote,
  markAcceptedAnswer,
};

export default commentService;