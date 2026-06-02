import mongoose from "mongoose";
import { z } from "zod";

// ─────────────────────────────────────────────────────────
// MongoDB ObjectId
// ─────────────────────────────────────────────────────────

export const objectIdSchema = z.string().refine(
  (value) => mongoose.Types.ObjectId.isValid(value),
  {
    message: "Invalid MongoDB ObjectId",
  }
);

// ─────────────────────────────────────────────────────────
// Route Params
// ─────────────────────────────────────────────────────────

export const mongoIdParamSchema = z.object({
  id: objectIdSchema,
});

// ─────────────────────────────────────────────────────────
// Pagination Query Helpers
// ─────────────────────────────────────────────────────────

export const pageSchema = z.coerce
  .number()
  .int()
  .positive()
  .default(1);

export const limitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .default(10);



export const postIdParamSchema = z.object({
  postId: objectIdSchema,
});