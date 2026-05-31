import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid MongoDB ObjectId"
  );

const detectionStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

export const createDetectionSchema = z.object({
  body: z.object({
    cropType: z
      .string()
      .trim()
      .min(1, "Crop type is required")
      .min(
        2,
        "Crop type must be at least 2 characters"
      )
      .max(
        100,
        "Crop type cannot exceed 100 characters"
      ),

    farmId: objectIdSchema.optional(),

    cropId: objectIdSchema.optional(),
  }),
});

export const detectionQuerySchema = z.object({
  query: z.object({
    status: detectionStatusSchema.optional(),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const detectionIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export type CreateDetectionInput =
  z.infer<typeof createDetectionSchema>["body"];

export type DetectionQueryInput =
  z.infer<typeof detectionQuerySchema>["query"];

export type DetectionIdParamInput =
  z.infer<typeof detectionIdParamSchema>["params"];