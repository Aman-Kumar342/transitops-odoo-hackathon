import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Seeds the five RBAC roles (idempotent) and one initial Admin user.
 * Run with: `npx prisma db seed` (loads .env), or `npm run seed`.
 *
 * Admin credentials come from env: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME.
 * The admin user is created only if it does not already exist (never resets password).
 */
const prisma = new PrismaClient();

const ROLES: { name: string; description: string }[] = [
  { name: "Admin", description: "System administration: users, roles, full access." },
  {
    name: "Fleet Manager",
    description: "Owns fleet assets, maintenance, vehicle lifecycle, and dispatch.",
  },
  { name: "Driver", description: "Creates and operates trips; monitors active deliveries." },
  {
    name: "Safety Officer",
    description: "Guards driver compliance: licenses, suspensions, safety scores.",
  },
  {
    name: "Financial Analyst",
    description: "Reviews fuel, expenses, maintenance costs, and profitability.",
  },
];

async function main() {
  // 1. Roles (idempotent upsert by unique name)
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }
  console.log(`✔ Seeded ${ROLES.length} roles`);

  // 2. Initial admin user
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "System Admin";

  if (!email || !password) {
    console.warn(
      "⚠ ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin user seed.",
    );
    return;
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "Admin" } });
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`✔ Admin user already exists (${email}) — left unchanged`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, name, passwordHash, roleId: adminRole.id, isActive: true },
  });
  console.log(`✔ Created admin user: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
