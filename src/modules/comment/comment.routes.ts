import { Router } from "express";

import commentController from "./comment.controller.js";

import { protect } from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";

import {
  createCommentSchema,
  updateCommentSchema,
} from "./comment.validation.js";

import {
  mongoIdParamSchema,
  postIdParamSchema,
} from "../../validations/common.validation.js";

// ─────────────────────────────────────────────────────────
// Standalone Comment Routes
// /comments/:id
// ─────────────────────────────────────────────────────────

const commentRouter = Router();

commentRouter.patch(
  "/:id",
  protect,
  validate(mongoIdParamSchema, "params"),
  validate(updateCommentSchema),
  commentController.updateComment
);

commentRouter.delete(
  "/:id",
  protect,
  validate(mongoIdParamSchema, "params"),
  commentController.deleteComment
);

commentRouter.post(
  "/:id/upvote",
  protect,
  validate(mongoIdParamSchema, "params"),
  commentController.toggleUpvote
);

commentRouter.patch(
  "/:id/accept",
  protect,
  validate(mongoIdParamSchema, "params"),
  commentController.markAcceptedAnswer
);

export { commentRouter };

// ─────────────────────────────────────────────────────────
// Nested Comment Routes
// /posts/:postId/comments
// ─────────────────────────────────────────────────────────

const nestedCommentRouter = Router({
  mergeParams: true,
});

nestedCommentRouter.get(
  "/",
  validate(postIdParamSchema, "params"),
  commentController.getComments
);

nestedCommentRouter.post(
  "/",
  protect,
  validate(postIdParamSchema, "params"),
  validate(createCommentSchema),
  commentController.addComment
);

export default nestedCommentRouter;