import { z, type ZodTypeAny } from "zod";
import { ValidationError } from "@/lib/http/errors";

/**
 * Validation layer scaffolding. (guidelines.md §13 — the backend is the authoritative
 * validation point; frontend validation is UX only. Schemas defined here are shared by
 * both client forms and server handlers so the two never drift.)
 *
 * Domain schemas (vehicle, driver, trip, …) are added in their respective phases.
 */

/**
 * Parse unknown input against a schema, throwing a typed ValidationError on failure.
 * Returns the schema's OUTPUT type, so `.default()`/`.transform()` results are reflected.
 */
export function parseOrThrow<S extends ZodTypeAny>(
  schema: S,
  input: unknown,
): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw ValidationError(
      "Validation failed",
      result.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }
  return result.data;
}

/** Parse a request's JSON body against a schema. */
export async function parseJsonBody<S extends ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw ValidationError("Request body must be valid JSON");
  }
  return parseOrThrow(schema, body);
}

// --- Common reusable field schemas (extended per module) ---
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

export const nonNegativeNumber = z
  .number({ invalid_type_error: "Must be a number" })
  .nonnegative("Must be zero or greater");

export const positiveNumber = z
  .number({ invalid_type_error: "Must be a number" })
  .positive("Must be greater than zero");
