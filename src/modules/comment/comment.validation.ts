import { z } from "zod";

import { objectIdSchema } from "../../validations/common.validation.js";

// ─────────────────────────────────────────────────────────
// Create Comment
// ─────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment cannot exceed 2000 characters"),

  // Optional → reply to another comment
  parentCommentId: objectIdSchema.optional(),
});

// ─────────────────────────────────────────────────────────
// Update Comment
// ─────────────────────────────────────────────────────────

export const updateCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment cannot exceed 2000 characters"),
});

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type CreateCommentInput =
  z.infer<typeof createCommentSchema>;

export type UpdateCommentInput =
  z.infer<typeof updateCommentSchema>;