-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "trips" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "cargo_weight" DECIMAL(12,2) NOT NULL,
    "planned_distance" DECIMAL(12,2) NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "start_odometer" DECIMAL(12,2),
    "final_odometer" DECIMAL(12,2),
    "fuel_consumed" DECIMAL(12,2),
    "revenue" DECIMAL(14,2),
    "dispatched_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"("status");

-- CreateIndex
CREATE INDEX "trips_vehicle_id_idx" ON "trips"("vehicle_id");

-- CreateIndex
CREATE INDEX "trips_driver_id_idx" ON "trips"("driver_id");

-- CreateIndex
CREATE INDEX "trips_created_at_idx" ON "trips"("created_at");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Raw SQL: DB-level business-rule guarantees (Prisma cannot express these).
-- The database must reject invalid data even if the API is bypassed. (guidelines §10)
-- ============================================================================

-- R4 RACE GUARD: at most ONE Dispatched (active) trip per vehicle and per driver.
-- These partial unique indexes make concurrent double-dispatch impossible at the DB
-- level: a second concurrent dispatch of the same vehicle/driver fails the unique
-- constraint and rolls back.
CREATE UNIQUE INDEX "trips_one_active_per_vehicle"
  ON "trips" ("vehicle_id") WHERE "status" = 'DISPATCHED';
CREATE UNIQUE INDEX "trips_one_active_per_driver"
  ON "trips" ("driver_id") WHERE "status" = 'DISPATCHED';

-- R5/R14: cargo positive, distance non-negative.
ALTER TABLE "trips"
  ADD CONSTRAINT "trips_cargo_positive_chk" CHECK ("cargo_weight" > 0),
  ADD CONSTRAINT "trips_distance_nonneg_chk" CHECK ("planned_distance" >= 0);

-- R11: odometer/fuel/revenue sanity when present.
ALTER TABLE "trips"
  ADD CONSTRAINT "trips_final_ge_start_chk"
    CHECK ("final_odometer" IS NULL OR "start_odometer" IS NULL OR "final_odometer" >= "start_odometer"),
  ADD CONSTRAINT "trips_fuel_positive_chk"
    CHECK ("fuel_consumed" IS NULL OR "fuel_consumed" > 0),
  ADD CONSTRAINT "trips_revenue_nonneg_chk"
    CHECK ("revenue" IS NULL OR "revenue" >= 0);
