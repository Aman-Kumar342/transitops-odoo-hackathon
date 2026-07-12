import { z } from "zod";
import {
  LICENSE_CATEGORIES,
  DRIVER_STATUS,
  normalizeLicense,
} from "@/lib/domain/driver";

/**
 * Driver input schemas. Shared by client forms (UX) and server handlers
 * (authoritative). (guidelines.md §13; problem.md §5 R3/R14/R17, §9)
 */

const licenseNumber = z
  .string({ required_error: "License number is required" })
  .trim()
  .min(1, "License number is required")
  .max(40, "License number is too long")
  .transform(normalizeLicense);

const safetyScore = z.coerce
  .number({ invalid_type_error: "Safety score must be a number" })
  .int("Safety score must be a whole number")
  .min(0, "Safety score must be between 0 and 100")
  .max(100, "Safety score must be between 0 and 100");

// Accept a YYYY-MM-DD date string; coerce to a Date at UTC midnight.
const licenseExpiryDate = z
  .string({ required_error: "License expiry date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date (YYYY-MM-DD)")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), {
    message: "Enter a valid date",
  });

const contactNumber = z
  .string({ required_error: "Contact number is required" })
  .trim()
  .min(7, "Enter a valid contact number")
  .max(20, "Contact number is too long")
  .regex(/^[+()\-\s0-9]+$/, "Contact number has invalid characters");

export const createDriverSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(120, "Name is too long"),
  licenseNumber,
  licenseCategory: z.enum(LICENSE_CATEGORIES, {
    errorMap: () => ({ message: "Select a valid license category" }),
  }),
  licenseExpiryDate,
  contactNumber,
  safetyScore: safetyScore.optional().default(100),
});

export const updateDriverSchema = createDriverSchema.partial();

export const listDriversQuerySchema = z.object({
  status: z.nativeEnum(DRIVER_STATUS).optional(),
  licenseCategory: z.enum(LICENSE_CATEGORIES).optional(),
  eligible: z.enum(["true", "false"]).optional(), // dispatch-eligible filter (R3)
  search: z.string().trim().min(1).optional(),
  licenseNumber: z.string().trim().min(1).optional(), // exact (async uniqueness check)
  includeDeleted: z.enum(["true"]).optional(),
  sort: z
    .enum(["createdAt", "name", "licenseExpiryDate", "safetyScore"])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Manual status-transition actions (§7.2). */
export const driverDutySchema = z.object({
  onDuty: z.boolean(),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type ListDriversQuery = z.infer<typeof listDriversQuerySchema>;
