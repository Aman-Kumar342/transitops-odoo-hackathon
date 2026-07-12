import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { fail } from "./response";

type RouteHandler = (
  req: Request,
  context: { params: Record<string, string> },
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a route handler with centralized error handling so every thrown error becomes a
 * correct, consistent response envelope. Route handlers stay thin: they parse input,
 * check auth, call a service, and shape the response — they never build error responses
 * by hand. (guidelines.md §9, §11)
 *
 *   export const POST = withErrorHandling(async (req) => { ... });
 */
export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (err) {
      // Zod validation errors → 400 with field details.
      if (err instanceof ZodError) {
        return fail(
          400,
          "VALIDATION_ERROR",
          "Validation failed",
          err.flatten().fieldErrors as Record<string, string[]>,
        );
      }

      // Known application errors → their mapped status/code.
      if (err instanceof AppError) {
        return fail(err.status, err.code, err.message, err.details);
      }

      // Unknown errors → 500, without leaking internals.
      console.error("Unhandled error in route handler:", err);
      return fail(500, "INTERNAL_ERROR", "Something went wrong");
    }
  };
}
