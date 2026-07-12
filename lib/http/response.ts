import { NextResponse } from "next/server";
import type { ErrorCode } from "./errors";

/**
 * Consistent API response envelope. Every route handler returns one of these shapes so
 * clients can rely on a single contract. (guidelines.md §11)
 *
 *   success: { ok: true, data: T }
 *   failure: { ok: false, error: { code, message, details? } }
 */

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true, data }, { status });
}

export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return ok(data, 201);
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function fail(
  status: number,
  code: ErrorCode,
  message: string,
  details?: Record<string, string[]>,
): NextResponse<ApiFailure> {
  return NextResponse.json(
    { ok: false, error: { code, message, details } },
    { status },
  );
}
