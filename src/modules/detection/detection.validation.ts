import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

const detectionStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

/**
 * CREATE DETECTION
 * Express body is flat: req.body.cropType
 */
export const createDetectionSchema = z.object({
  cropType: z
    .string()
    .trim()
    .min(2, "Crop type must be at least 2 characters")
    .max(100),

  farmId: objectIdSchema.optional(),
  cropId: objectIdSchema.optional(),
});

/**
 * QUERY
 */
export const detectionQuerySchema = z.object({
  status: detectionStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * PARAMS
 */
export const detectionIdParamSchema = z.object({
  id: objectIdSchema,
});

export type CreateDetectionInput = z.infer<typeof createDetectionSchema>;
export type DetectionQueryInput = z.infer<typeof detectionQuerySchema>;
export type DetectionIdParamInput = z.infer<typeof detectionIdParamSchema>;