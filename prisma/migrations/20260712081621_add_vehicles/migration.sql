-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED');

-- CreateTable
CREATE TABLE "vehicles" (
    "id" SERIAL NOT NULL,
    "registration_number" TEXT NOT NULL,
    "name_model" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "max_load_capacity" DECIMAL(12,2) NOT NULL,
    "odometer" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "acquisition_cost" DECIMAL(14,2) NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "region" TEXT,
    "retired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registration_number_key" ON "vehicles"("registration_number");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE INDEX "vehicles_type_idx" ON "vehicles"("type");

-- CreateIndex
CREATE INDEX "vehicles_region_idx" ON "vehicles"("region");

-- ============================================================================
-- Raw SQL: DB-level business-rule guarantees (Prisma cannot express these).
-- The database must reject invalid data even if the API is bypassed. (guidelines §10)
-- ============================================================================

-- R14: non-negative money/quantity; R5-support: capacity must be positive.
ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_capacity_positive_chk" CHECK ("max_load_capacity" > 0),
  ADD CONSTRAINT "vehicles_odometer_nonneg_chk" CHECK ("odometer" >= 0),
  ADD CONSTRAINT "vehicles_acqcost_nonneg_chk" CHECK ("acquisition_cost" >= 0);

-- §9/§18: vehicle type must be one of the allowed set (closed enum at the DB).
ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_type_allowed_chk"
  CHECK ("type" IN ('Truck', 'Van', 'Car', 'Bus', 'Trailer', 'Other'));

-- R1/§18-J: registration_number is stored normalized (trimmed, non-empty, uppercase).
-- Combined with the UNIQUE index this makes uniqueness case/whitespace-insensitive
-- even against direct SQL inserts.
ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_regno_normalized_chk"
  CHECK (
    length("registration_number") > 0
    AND "registration_number" = btrim("registration_number")
    AND "registration_number" = upper("registration_number")
  );
