-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "maintenance_logs" (
    "id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "odometer_at_service" DECIMAL(12,2),
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_logs_vehicle_id_idx" ON "maintenance_logs"("vehicle_id");

-- CreateIndex
CREATE INDEX "maintenance_logs_status_idx" ON "maintenance_logs"("status");

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Raw SQL: DB-level business-rule guarantees (Prisma cannot express these).
-- The database must reject invalid data even if the API is bypassed. (guidelines §10)
-- ============================================================================

-- At most ONE Open maintenance record per vehicle (prevents overlapping/duplicate
-- open records; supports R9 In-Shop invariant).
CREATE UNIQUE INDEX "maintenance_one_open_per_vehicle"
  ON "maintenance_logs" ("vehicle_id") WHERE "status" = 'OPEN';

-- R14: cost is non-negative.
ALTER TABLE "maintenance_logs"
  ADD CONSTRAINT "maintenance_cost_nonneg_chk" CHECK ("cost" >= 0);
