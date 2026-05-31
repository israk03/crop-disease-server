import { z } from "zod";

const cropStatuses = ["GROWING", "HARVESTED", "FAILED"] as const;

/**
 * Validate ISO date strings and convert later in service layer
 */
const dateString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format (must be ISO string)",
  });

export const createCropSchema = z.object({
    name: z
      .string()
      .trim()
      .min(2, "Crop name must be at least 2 characters")
      .max(100, "Crop name cannot exceed 100 characters"),

    variety: z
      .string()
      .trim()
      .max(100, "Variety cannot exceed 100 characters")
      .optional(),

    plantingDate: dateString,

    expectedHarvestDate: dateString.optional(),

    notes: z
      .string()
      .trim()
      .max(500, "Notes cannot exceed 500 characters")
      .optional(),

});

export const updateCropSchema = z.object({

      name: z
        .string()
        .trim()
        .min(2, "Crop name must be at least 2 characters")
        .max(100, "Crop name cannot exceed 100 characters")
        .optional(),

      variety: z
        .string()
        .trim()
        .max(100, "Variety cannot exceed 100 characters")
        .optional(),

      plantingDate: dateString.optional(),

      expectedHarvestDate: dateString.optional(),

      status: z.enum(cropStatuses).optional(),

      notes: z
        .string()
        .trim()
        .max(500, "Notes cannot exceed 500 characters")
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",

});

export type CreateCropInput = z.infer<
  typeof createCropSchema
>;

export type UpdateCropInput = z.infer<
  typeof updateCropSchema
>;