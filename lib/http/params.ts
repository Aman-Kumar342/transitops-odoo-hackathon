import { ValidationError } from "./errors";

/** Parses a positive integer route param, throwing a 400 on invalid input. */
export function parseIdParam(raw: string | undefined, label = "id"): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw ValidationError(`Invalid ${label}`);
  }
  return id;
}
