import { userRepository, type UserWithRole } from "@/lib/repositories/user.repository";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { SessionClaims } from "@/lib/auth/jwt";
import type { RoleName } from "@/lib/auth/rbac";
import {
  UnauthenticatedError,
  NotFoundError,
  ValidationError,
} from "@/lib/http/errors";

/**
 * Authentication business logic. (guidelines.md §8, §16)
 *
 * Security notes:
 *  - Unknown email, wrong password, and inactive account ALL return the same generic
 *    error, to prevent user enumeration.
 *  - Passwords are compared via bcrypt; hashes never leave this layer.
 */

export interface SafeUser {
  id: number;
  email: string;
  name: string;
  role: { id: number; name: RoleName };
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

function toSafeUser(user: UserWithRole): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: { id: user.role.id, name: user.role.name as RoleName },
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

const INVALID_CREDENTIALS = "Invalid email or password";

export const authService = {
  /** Verifies credentials and returns session claims + the safe user. */
  async login(
    email: string,
    password: string,
  ): Promise<{ claims: SessionClaims; user: SafeUser }> {
    const user = await userRepository.findByEmail(email);
    // Same error for missing user / inactive / bad password (no enumeration).
    if (!user || !user.isActive) {
      throw UnauthenticatedError(INVALID_CREDENTIALS);
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw UnauthenticatedError(INVALID_CREDENTIALS);
    }

    await userRepository.updateLastLogin(user.id);

    return {
      claims: {
        userId: user.id,
        email: user.email,
        role: user.role.name as RoleName,
      },
      user: toSafeUser(user),
    };
  },

  /** Returns the current user's safe profile. */
  async getCurrentUser(userId: number): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw NotFoundError("User not found");
    return toSafeUser(user);
  },

  /** Changes the user's password after verifying the current one. */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw NotFoundError("User not found");

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw ValidationError("Current password is incorrect", {
        currentPassword: ["Current password is incorrect"],
      });
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePassword(userId, passwordHash);
  },
};
