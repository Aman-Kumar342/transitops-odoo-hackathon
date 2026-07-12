import { prisma } from "@/lib/db";

/**
 * User data access. DB operations only — no business logic. (guidelines.md §9)
 */
export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  },

  findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  },

  updateLastLogin(id: number) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  },

  updatePassword(id: number, passwordHash: string) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  },
};

export type UserWithRole = NonNullable<
  Awaited<ReturnType<typeof userRepository.findById>>
>;
