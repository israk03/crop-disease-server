import mongoose from "mongoose";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const objectIdSchema = z.string().refine(
  (value) => mongoose.Types.ObjectId.isValid(value),
  {
    message: "Invalid MongoDB ObjectId",
  }
);

const tagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, "Tag cannot be empty")
  )
  .max(10, "Cannot add more than 10 tags")
  .transform((tags) =>
    tags.map((tag) => tag.toLowerCase())
  );

const postTypeSchema = z.enum([
  "discussion",
  "question",
  "disease_case",
  "advice",
]);

/* -------------------------------------------------------------------------- */
/*                               Create Post                                  */
/* -------------------------------------------------------------------------- */

export const createPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title cannot exceed 200 characters"),

  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description cannot exceed 5000 characters"),

  tags: tagsSchema.optional().default([]),

  cropType: z
    .string()
    .trim()
    .toLowerCase()
    .optional(),

  postType: postTypeSchema
    .optional()
    .default("discussion"),

  linkedDetection: objectIdSchema.optional(),
});

/* -------------------------------------------------------------------------- */
/*                               Update Post                                  */
/* -------------------------------------------------------------------------- */

export const updatePostSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, "Title must be at least 5 characters")
      .max(200, "Title cannot exceed 200 characters")
      .optional(),

    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(5000, "Description cannot exceed 5000 characters")
      .optional(),

    tags: tagsSchema.optional(),

    cropType: z
      .string()
      .trim()
      .toLowerCase()
      .optional(),

    postType: postTypeSchema.optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message:
        "At least one field is required for update",
    }
  );

/* -------------------------------------------------------------------------- */
/*                               Query Params                                 */
/* -------------------------------------------------------------------------- */

export const postQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .optional(),

  cropType: z
    .string()
    .trim()
    .toLowerCase()
    .optional(),

  tag: z
    .string()
    .trim()
    .toLowerCase()
    .optional(),

  postType: postTypeSchema.optional(),

  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(10),

  sortBy: z
    .enum([
      "newest",
      "upvotes",
      "trending",
    ])
    .default("newest"),
});


export const mongoIdParamSchema = z.object({
  id: z.string().refine(
    (value) => mongoose.Types.ObjectId.isValid(value),
    {
      message: "Invalid post id",
    }
  ),
});


/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type CreatePostInput =
  z.infer<typeof createPostSchema>;

export type UpdatePostInput =
  z.infer<typeof updatePostSchema>;

export type PostQueryInput =
  z.infer<typeof postQuerySchema>;