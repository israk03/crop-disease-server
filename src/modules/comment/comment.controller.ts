import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import commentService from "./comment.service.js";
import sendResponse from "../../utils/sendResponse.js";

import {
  CreateCommentInput,
  UpdateCommentInput,
} from "./comment.validation.js";

import { ValidatedRequest } from "../../middlewares/validate.middleware.js";

// ─────────────────────────────────────────────────────────
// Add Comment / Reply
// ─────────────────────────────────────────────────────────

const addComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedReq =
      req as ValidatedRequest<CreateCommentInput>;

    const comment = await commentService.addComment(
      req.params.postId as string,
      req.user!.id,
      validatedReq.validated
    );

    sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Comment added successfully",
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// Get Comments
// ─────────────────────────────────────────────────────────

const getComments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const comments = await commentService.getComments(
      req.params.postId as string
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Comments retrieved successfully",
      data: { comments },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// Update Comment
// ─────────────────────────────────────────────────────────

const updateComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedReq =
      req as ValidatedRequest<UpdateCommentInput>;

    const comment = await commentService.updateComment(
      req.params.id as string,
      req.user!.id,
      validatedReq.validated
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Comment updated successfully",
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// Delete Comment
// ─────────────────────────────────────────────────────────

const deleteComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await commentService.deleteComment(
      req.params.id as string,
      req.user!.id,
      req.user!.role
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Comment deleted successfully",
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
    const result = await commentService.toggleUpvote(
      req.params.id as string,
      req.user!.id
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: result.upvoted
        ? "Comment upvoted"
        : "Upvote removed",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// Accepted Answer
// ─────────────────────────────────────────────────────────

const markAcceptedAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const comment =
      await commentService.markAcceptedAnswer(
        req.params.id as string,
        req.user!.id
      );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: comment.isAcceptedAnswer
        ? "Marked as accepted answer"
        : "Accepted answer removed",
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

const commentController = {
  addComment,
  getComments,
  updateComment,
  deleteComment,
  toggleUpvote,
  markAcceptedAnswer,
};

export default commentController;