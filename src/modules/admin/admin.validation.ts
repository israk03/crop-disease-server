import { z } from "zod";

/* ─────────────────────────────────────────────────────────
   Shared Enums (centralized for scalability)
───────────────────────────────────────────────────────── */

export const UserRoleEnum = z.enum(["FARMER", "EXPERT", "ADMIN"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const DetectionStatusEnum = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);
export type DetectionStatus = z.infer<typeof DetectionStatusEnum>;

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */

const toNumber = (defaultValue: number) =>
  z
    .string()
    .optional()
    .transform((val) => {
      const num = Number(val);
      return Number.isFinite(num) ? num : defaultValue;
    });

const toBoolean = z
  .string()
  .optional()
  .transform((val) => {
    if (val === "true") return true;
    if (val === "false") return false;
    return undefined;
  });

/* ─────────────────────────────────────────────────────────
   Schemas
───────────────────────────────────────────────────────── */

export const userListQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: UserRoleEnum.optional(),
  isActive: toBoolean,
  page: toNumber(1),
  limit: toNumber(20),
});

export const changeRoleSchema = z.object({
  role: UserRoleEnum,
});

export const changeStatusSchema = z.object({
  isActive: z.boolean(),
});

export const analyticsQuerySchema = z.object({
  days: toNumber(30),
});

export const detectionListQuerySchema = z.object({
  status: DetectionStatusEnum.optional(),
  page: toNumber(1),
  limit: toNumber(20),
});

/* ─────────────────────────────────────────────────────────
   Types (FIXED)
───────────────────────────────────────────────────────── */

export type UserListQueryInput = z.infer<
  typeof userListQuerySchema
>;

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;

export type AnalyticsQueryInput = z.infer<
  typeof analyticsQuerySchema
>;

export type DetectionListQueryInput = z.infer<
  typeof detectionListQuerySchema
>;