import { z } from "zod";

const outbreakLevels = ["WATCH", "WARNING", "CRITICAL"] as const;

export const createAlertSchema = z.object({
  body: z.object({
    diseaseName: z
      .string()
      .trim()
      .min(2, "Disease name must be at least 2 characters")
      .max(200, "Disease name cannot exceed 200 characters"),

    cropType: z
      .string()
      .trim()
      .min(2, "Crop type must be at least 2 characters")
      .max(100, "Crop type cannot exceed 100 characters"),

    region: z
      .string()
      .trim()
      .min(2, "Region must be at least 2 characters")
      .max(100, "Region cannot exceed 100 characters"),

    outbreakLevel: z.enum(outbreakLevels),

    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(1000, "Description cannot exceed 1000 characters"),
  }),
});

export const alertQuerySchema = z.object({
  query: z.object({
    region: z
      .string()
      .trim()
      .min(2, "Region must be at least 2 characters")
      .max(100)
      .optional(),

    cropType: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .optional(),

    outbreakLevel: z.enum(outbreakLevels).optional(),

    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),

    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10)),
  }),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>["body"];
export type AlertQueryInput = z.infer<typeof alertQuerySchema>["query"];