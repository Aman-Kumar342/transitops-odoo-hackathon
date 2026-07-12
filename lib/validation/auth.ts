import { z } from "zod";
import { emailSchema } from "./index";

/**
 * Auth input schemas. Shared by client forms (UX) and server handlers (authoritative).
 * (guidelines.md §13)
 */

/** Password policy: min 8 chars, at least one letter and one number. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long")
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), {
    message: "Password must include at least one letter and one number",
  });

export const loginSchema = z.object({
  email: emailSchema,
  // On login we don't reveal the policy — just require a non-empty value.
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
