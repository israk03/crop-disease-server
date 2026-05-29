import { z } from "zod";

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;

const PASSWORD_MIN_LENGTH = 8;

// ─────────────────────────────────────────────────────────
// COMMON SCHEMAS
// ─────────────────────────────────────────────────────────

const nameSchema = z
  .string({
    error: "Name is required",
  })
  .trim()
  .min(1, "Name cannot be empty")
  .min(
    NAME_MIN_LENGTH,
    `Name must be at least ${NAME_MIN_LENGTH} characters`
  )
  .max(
    NAME_MAX_LENGTH,
    `Name cannot exceed ${NAME_MAX_LENGTH} characters`
  );

const emailSchema = z
  .string({
    error: "Email is required",
  })
  .trim()
  .toLowerCase()
  .email("Invalid email format");

const passwordSchema = z
  .string({
    error: "Password is required",
  })
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  )
  .regex(
    /^(?=.*[a-z])/,
    "Password must contain at least one lowercase letter"
  )
  .regex(
    /^(?=.*[A-Z])/,
    "Password must contain at least one uppercase letter"
  )
  .regex(
    /^(?=.*\d)/,
    "Password must contain at least one number"
  )
  .regex(
    /^(?=.*[@$!%*?&])/,
    "Password must contain at least one special character"
  );

const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^(\+8801|01)[3-9]\d{8}$/,
    "Invalid Bangladeshi phone number"
  )
  .optional();

const roleSchema = z.enum(["FARMER", "EXPERT"]);

// ─────────────────────────────────────────────────────────
// REGISTER VALIDATION
// ─────────────────────────────────────────────────────────

export const registerSchema = z.object({
  body: z.object({
    name: nameSchema,

    email: emailSchema,

    phone: phoneSchema,

    password: passwordSchema,

    role: roleSchema.default("FARMER"),

  }),
});

// ─────────────────────────────────────────────────────────
// LOGIN VALIDATION
// ─────────────────────────────────────────────────────────

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,

    password: z
      .string({
        error: "Password is required",
      })
      .min(1, "Password is required"),
  }),
});

// ─────────────────────────────────────────────────────────
// REFRESH TOKEN VALIDATION
// ─────────────────────────────────────────────────────────

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z
      .string()
      .trim()
      .min(1, "Refresh token is required")
      .optional(),
  }),
});

// ─────────────────────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────────────────────

export type RegisterInput = z.infer<
  typeof registerSchema
>["body"];

export type LoginInput = z.infer<
  typeof loginSchema
>["body"];

export type RefreshTokenInput = z.infer<
  typeof refreshTokenSchema
>["body"];

