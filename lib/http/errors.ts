/**
 * Application error taxonomy.
 *
 * Services throw these typed errors; the route-handler wrapper (lib/http/handler.ts)
 * maps them to a consistent HTTP response envelope. This keeps route handlers thin and
 * gives every failure a correct, predictable status code. (guidelines.md §11)
 */

export type ErrorCode =
  | "VALIDATION_ERROR" // 400 — malformed input
  | "UNAUTHENTICATED" // 401 — missing/invalid credentials
  | "FORBIDDEN" // 403 — authenticated but not allowed (RBAC)
  | "NOT_FOUND" // 404 — resource does not exist
  | "CONFLICT" // 409 — duplicate / race / uniqueness
  | "BUSINESS_RULE_VIOLATION" // 422 — a domain rule (R1–R18) was violated
  | "INTERNAL_ERROR"; // 500 — unexpected

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  BUSINESS_RULE_VIOLATION: 422,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Optional field-level details, e.g. { registration_number: "already exists" }. */
  readonly details?: Record<string, string[]>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

// Convenience constructors for readable service code.
export const ValidationError = (
  message = "Validation failed",
  details?: Record<string, string[]>,
) => new AppError("VALIDATION_ERROR", message, details);

export const UnauthenticatedError = (message = "Authentication required") =>
  new AppError("UNAUTHENTICATED", message);

export const ForbiddenError = (message = "You do not have permission to do that") =>
  new AppError("FORBIDDEN", message);

export const NotFoundError = (message = "Resource not found") =>
  new AppError("NOT_FOUND", message);

export const ConflictError = (
  message = "Resource already exists",
  details?: Record<string, string[]>,
) => new AppError("CONFLICT", message, details);

export const BusinessRuleError = (
  message: string,
  details?: Record<string, string[]>,
) => new AppError("BUSINESS_RULE_VIOLATION", message, details);
