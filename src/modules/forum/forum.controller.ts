import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import forumService from "./forum.service.js";
import sendResponse from "../../utils/sendResponse.js";

import {
  CreatePostInput,
  UpdatePostInput,
  PostQueryInput,
} from "./forum.validation.js";
import { ValidatedRequest } from "../../middlewares/validate.middleware.js";

//import { ValidatedRequest } from "../../middlewares/validate.js";

// ─────────────────────────────────────────────────────────
// Create Post
// ─────────────────────────────────────────────────────────

const createPost = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedReq =
      req as ValidatedRequest<CreatePostInput>;

    const files =
      req.files as Express.Multer.File[] | undefined;

    const post = await forumService.createPost(
      req.user!.id,
      validatedReq.validated,
      files
    );

    sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Post created successfully",
      data: { post },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// Get Posts
// ─────────────────────────────────────────────────────────

const getPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedReq =
      req as ValidatedRequest<PostQueryInput>;

    const { posts, meta } =
      await forumService.getPosts(
        validatedReq.validated
      );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Posts retrieved successfully",
      data: { posts },
      meta,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// Trending Posts
// ─────────────────────────────────────────────────────────

const getTrendingPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const posts =
      await forumService.getTrendingPosts();

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Trending posts retrieved successfully",
      data: { posts },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// Single Post
// ─────────────────────────────────────────────────────────

const getPostById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const post = await forumService.getPostById(
      req.params.id as string,
      req.user?.id
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Post retrieved successfully",
      data: { post },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// Update Post
// ─────────────────────────────────────────────────────────

const updatePost = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedReq =
      req as ValidatedRequest<UpdatePostInput>;

    const post = await forumService.updatePost(
      req.params.id as string,
      req.user!.id,
      validatedReq.validated
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Post updated successfully",
      data: { post },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// Delete Post
// ─────────────────────────────────────────────────────────

const deletePost = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await forumService.deletePost(
      req.params.id as string,
      req.user!.id,
      req.user!.role
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// Toggle Upvote
// ─────────────────────────────────────────────────────────

const toggleUpvote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result =
      await forumService.toggleUpvote(
        req.params.id as string,
        req.user!.id
      );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: result.upvoted
        ? "Post upvoted"
        : "Upvote removed",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const forumController = {
  createPost,
  getPosts,
  getTrendingPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleUpvote,
};

export default forumController;