import { Router } from "express";
import forumController from "./forum.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";
import { uploadMultipleImages } from "../../middlewares/upload.middleware.js";
import {
  createPostSchema,
  updatePostSchema,
  postQuerySchema,
} from "./forum.validation.js";

// Optional auth middleware — attaches req.user if token present, but doesn't
// reject the request if no token. Used for public routes that benefit from
// knowing who's logged in (e.g. "has this user upvoted this post?")
import { optionalProtect } from "../../middlewares/auth.middleware.js";
import { mongoIdParamSchema } from "../../validations/common.validation.js";
import parseForumFormData from "../../middlewares/parseForumFormData.js";

const router = Router();



router.get("/trending", forumController.getTrendingPosts);

router.get(
  "/",
  validate(postQuerySchema, "query"),
  forumController.getPosts
);

router.get(
  "/:id",
  validate(mongoIdParamSchema, "params"),
  optionalProtect,
  forumController.getPostById
);

router.post(
  "/",
  protect,
  authorize("FARMER", "EXPERT"),
  uploadMultipleImages("images", 5),
  parseForumFormData,
  validate(createPostSchema),
  forumController.createPost
);

router.patch(
  "/:id",
  protect,
  validate(mongoIdParamSchema, "params"),
  validate(updatePostSchema),
  forumController.updatePost
);

router.delete(
  "/:id",
  protect,
  validate(mongoIdParamSchema, "params"),
  forumController.deletePost
);

router.post(
  "/:id/upvote",
  protect,
  validate(mongoIdParamSchema, "params"),
  forumController.toggleUpvote
);





export default router;