import { z } from "zod";

/**
 * PROFILE UPDATE
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(50)
    .trim()
    .optional(),

  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number format")
    .optional(),

  location: z
    .string()
    .max(100)
    .trim()
    .optional(),
}).strict();

/**
 * EXPERT PROFILE UPDATE
 */
export const updateExpertProfileSchema = z.object({
  bio: z
    .string()
    .max(500)
    .trim()
    .optional(),

  experience: z
    .number()
    .int("Experience must be a whole number")
    .min(0)
    .max(60)
    .optional(),

  specializations: z
    .array(z.string().trim().min(2).max(40))
    .max(10)
    .optional(),
}).strict();

/**
 * PASSWORD CHANGE
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),

  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must include uppercase, lowercase, and number"
    ),

  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});


export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateExpertProfileInput = z.infer<typeof updateExpertProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;