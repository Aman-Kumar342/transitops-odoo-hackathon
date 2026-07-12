import bcrypt from "bcryptjs";

/**
 * Password hashing. Passwords are ALWAYS stored hashed (bcrypt) — never plaintext,
 * never logged. (guidelines.md §14) Node runtime only (do not import from middleware).
 */

const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
