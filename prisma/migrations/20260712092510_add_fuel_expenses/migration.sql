-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('TOLL', 'PARKING', 'INSURANCE', 'FINE', 'MISC');

-- CreateTable
CREATE TABLE "fuel_logs" (
    "id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "trip_id" INTEGER,
    "liters" DECIMAL(10,2) NOT NULL,
    "cost" DECIMAL(14,2) NOT NULL,
    "date" DATE NOT NULL,
    "odometer" DECIMAL(12,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "trip_id" INTEGER,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fuel_logs_vehicle_id_idx" ON "fuel_logs"("vehicle_id");

-- CreateIndex
CREATE INDEX "fuel_logs_date_idx" ON "fuel_logs"("date");

-- CreateIndex
CREATE INDEX "fuel_logs_trip_id_idx" ON "fuel_logs"("trip_id");

-- CreateIndex
CREATE INDEX "expenses_vehicle_id_idx" ON "expenses"("vehicle_id");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- AddForeignKey
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Raw SQL: DB-level business-rule guarantees (Prisma cannot express these).
-- The database must reject invalid data even if the API is bypassed. (guidelines §10)
-- ============================================================================

-- R14: fuel liters must be positive; fuel cost non-negative.
ALTER TABLE "fuel_logs"
  ADD CONSTRAINT "fuel_liters_positive_chk" CHECK ("liters" > 0),
  ADD CONSTRAINT "fuel_cost_nonneg_chk" CHECK ("cost" >= 0);

-- R14: expense amount non-negative.
ALTER TABLE "expenses"
  ADD CONSTRAINT "expense_amount_nonneg_chk" CHECK ("amount" >= 0);
