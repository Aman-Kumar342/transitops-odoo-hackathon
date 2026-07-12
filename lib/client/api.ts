"use client";

import type { ApiResponse } from "@/lib/http/response";

/**
 * Client fetch helper. Unwraps the API envelope and, on 401 (expired/missing session),
 * redirects to the login page — this is the client half of session-expired handling.
 * (guidelines.md §12)
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, string[]>;
  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (res.status === 401 && typeof window !== "undefined") {
    const next = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?next=${next}`;
    // Prevent callers from continuing while we redirect.
    throw new ApiError(401, "UNAUTHENTICATED", "Session expired");
  }

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!body) {
    throw new ApiError(res.status, "INTERNAL_ERROR", "Unexpected response");
  }
  if (!body.ok) {
    throw new ApiError(
      res.status,
      body.error.code,
      body.error.message,
      body.error.details,
    );
  }
  return body.data;
}
