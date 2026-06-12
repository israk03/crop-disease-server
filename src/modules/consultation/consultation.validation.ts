import { z } from "zod";

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

export const CONSULTATION_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

export const MESSAGE_TYPES = [
  "TEXT",
  "IMAGE",
] as const;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

/*
|--------------------------------------------------------------------------
| Create Consultation
|--------------------------------------------------------------------------
*/

export const createConsultationSchema = z.object({
  body: z.object({
    expertId: objectIdSchema,

    problemDescription: z
      .string()
      .min(1, "Problem description is required")
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(2000, "Description cannot exceed 2000 characters"),

    cropType: z
      .string()
      .min(1, "Crop type is required")
      .trim()
      .min(2, "Crop type is required")
      .max(100, "Crop type cannot exceed 100 characters"),

    linkedDetection: objectIdSchema.optional(),

    scheduledTime: z
      .string()
      .optional()
      .refine(
        (value) =>
          !value || !Number.isNaN(Date.parse(value)),
        "Invalid scheduled time format"
      )
      .refine(
        (value) =>
          !value || new Date(value) > new Date(),
        "Scheduled time must be in the future"
      ),
  }),
});

/*
|--------------------------------------------------------------------------
| Send Message
|--------------------------------------------------------------------------
*/

export const sendMessageSchema = z.object({
  body: z
    .object({
      content: z
        .string()
        .trim()
        .max(2000, "Message cannot exceed 2000 characters")
        .optional(),

      messageType: z
        .enum(MESSAGE_TYPES)
        .default("TEXT"),

      imageUrl: z
        .string()
        .url("Invalid image URL")
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (
        data.messageType === "TEXT" &&
        (!data.content || data.content.length === 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content"],
          message: "Message content is required",
        });
      }

      if (
        data.messageType === "IMAGE" &&
        !data.imageUrl
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["imageUrl"],
          message: "Image URL is required",
        });
      }
    }),
});

/*
|--------------------------------------------------------------------------
| Review
|--------------------------------------------------------------------------
*/

export const reviewSchema = z.object({
  body: z.object({
    rating: z
      .number({
        error: "Rating is required",
      })
      .int("Rating must be a whole number")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5"),

    review: z
      .string()
      .trim()
      .max(1000, "Review cannot exceed 1000 characters")
      .optional(),
  }),
});

/*
|--------------------------------------------------------------------------
| Cancel Consultation
|--------------------------------------------------------------------------
*/

export const cancelConsultationSchema = z.object({
  body: z.object({
    reason: z
      .string()
      .min(1, "Reason is required")
      .trim()
      .min(3, "Reason is too short")
      .max(500, "Reason cannot exceed 500 characters"),
  }),
});

/*
|--------------------------------------------------------------------------
| Status Update
|--------------------------------------------------------------------------
*/

export const updateConsultationStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      "ACCEPTED",
      "ACTIVE",
      "COMPLETED",
      "CANCELLED",
    ]),
  }),
});

/*
|--------------------------------------------------------------------------
| Query Params
|--------------------------------------------------------------------------
*/

export const consultationQuerySchema = z.object({
  query: z.object({
    status: z
      .enum(CONSULTATION_STATUSES)
      .optional(),

    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10),
  }),
});

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

export type CreateConsultationInput =
  z.infer<typeof createConsultationSchema>["body"];

export type SendMessageInput =
  z.infer<typeof sendMessageSchema>["body"];

export type ReviewInput =
  z.infer<typeof reviewSchema>["body"];

export type CancelConsultationInput =
  z.infer<typeof cancelConsultationSchema>["body"];

export type UpdateConsultationStatusInput =
  z.infer<typeof updateConsultationStatusSchema>["body"];

export type ConsultationQueryInput =
  z.infer<typeof consultationQuerySchema>["query"];