import { z } from "zod";

export const EMAIL_REGEX = /^[A-Za-z0-9._%+\-]+@bicol-u\.edu\.ph$/;

export const DEPARTMENTS = [
  "CSD",
  "ENGINEERING",
  "NURSING",
  "TECHNOLOGY",
  "EDUCATION",
  "ENTREPRENEURSHIP",
] as const;

export const YEAR_LEVELS = [
  "1st year",
  "2nd year",
  "3rd year",
  "4th year",
] as const;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(EMAIL_REGEX, "Use your @bicol-u.edu.ph student email");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(100),
    email: emailSchema,
    password: z.string().min(8, "Use at least 8 characters").max(72),
    confirmPassword: z.string(),
    yearLevel: z.enum(YEAR_LEVELS),
    department: z.enum(DEPARTMENTS),
    program: z.string().trim().min(2).max(20),
    contactMobile: z
      .string()
      .trim()
      .min(7, "Enter a reachable mobile number")
      .max(20),
    contactMessenger: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const verifySchema = z.object({
  email: emailSchema,
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

export const resendSchema = z.object({ email: emailSchema });

export const forgotPasswordSchema = z.object({ email: emailSchema });

const newPasswordSchema = z.string().min(8, "Use at least 8 characters").max(72);

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyInput = z.infer<typeof verifySchema>;
