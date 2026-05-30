import { z } from "zod";

const soilTypes = [
  "CLAY",
  "SANDY",
  "LOAMY",
  "SILTY",
  "PEATY",
  "CHALKY",
  "OTHER",
] as const;

const locationSchema = z.object({
  longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),

  latitude: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
});

export const createFarmSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Farm name must be at least 2 characters")
      .max(100, "Farm name cannot exceed 100 characters"),

    size: z
      .number()
      .min(0.01, "Farm size must be greater than 0"),

    soilType: z.enum(soilTypes),

    address: z
      .string()
      .trim()
      .min(5, "Address must be at least 5 characters")
      .max(255, "Address cannot exceed 255 characters"),

    region: z
      .string()
      .trim()
      .min(2, "Region must be at least 2 characters")
      .max(100, "Region cannot exceed 100 characters"),

    location: locationSchema.optional(),
  }),
});

export const updateFarmSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Farm name must be at least 2 characters")
        .max(100, "Farm name cannot exceed 100 characters")
        .optional(),

      size: z
        .number()
        .min(0.01, "Farm size must be greater than 0")
        .optional(),

      soilType: z.enum(soilTypes).optional(),

      address: z
        .string()
        .trim()
        .min(5, "Address must be at least 5 characters")
        .max(255, "Address cannot exceed 255 characters")
        .optional(),

      region: z
        .string()
        .trim()
        .min(2, "Region must be at least 2 characters")
        .max(100, "Region cannot exceed 100 characters")
        .optional(),

      location: locationSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

export type CreateFarmInput = z.infer<typeof createFarmSchema>["body"];
export type UpdateFarmInput = z.infer<typeof updateFarmSchema>["body"];