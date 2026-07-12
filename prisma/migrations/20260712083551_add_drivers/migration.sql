-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED');

-- CreateTable
CREATE TABLE "drivers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "license_category" TEXT NOT NULL,
    "license_expiry_date" DATE NOT NULL,
    "contact_number" TEXT NOT NULL,
    "safety_score" INTEGER NOT NULL DEFAULT 100,
    "status" "DriverStatus" NOT NULL DEFAULT 'AVAILABLE',
    "user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_license_number_key" ON "drivers"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"("user_id");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE INDEX "drivers_license_expiry_date_idx" ON "drivers"("license_expiry_date");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Raw SQL: DB-level business-rule guarantees (Prisma cannot express these).
-- The database must reject invalid data even if the API is bypassed. (guidelines §10)
-- ============================================================================

-- R14: safety score is bounded 0..100.
ALTER TABLE "drivers"
  ADD CONSTRAINT "drivers_safety_score_range_chk"
  CHECK ("safety_score" >= 0 AND "safety_score" <= 100);

-- §9/§18: license category must be one of the allowed set (closed enum at the DB).
ALTER TABLE "drivers"
  ADD CONSTRAINT "drivers_license_category_allowed_chk"
  CHECK ("license_category" IN ('LMV', 'HMV', 'MCWG', 'Trailer', 'Other'));

-- R17/§18: license_number stored normalized (trimmed, non-empty, uppercase); with the
-- UNIQUE index this makes uniqueness case/whitespace-insensitive even against raw SQL.
ALTER TABLE "drivers"
  ADD CONSTRAINT "drivers_license_normalized_chk"
  CHECK (
    length("license_number") > 0
    AND "license_number" = btrim("license_number")
    AND "license_number" = upper("license_number")
  );

-- Basic contact-number sanity (non-empty).
ALTER TABLE "drivers"
  ADD CONSTRAINT "drivers_contact_nonempty_chk"
  CHECK (length(btrim("contact_number")) > 0);
