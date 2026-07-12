import { fuelRepository } from "@/lib/repositories/fuel.repository";
import { expenseRepository } from "@/lib/repositories/expense.repository";
import { maintenanceRepository } from "@/lib/repositories/maintenance.repository";
import { vehicleRepository } from "@/lib/repositories/vehicle.repository";
import { NotFoundError } from "@/lib/http/errors";

/**
 * Operational-cost aggregation (problem.md §3.7, §14, §18-E).
 *
 * Operational Cost = Fuel + Maintenance, computed with SQL SUM aggregates (no app-side
 * loops, §17). Maintenance cost comes ONLY from maintenance_logs and fuel from fuel_logs
 * - the single sources of truth - so nothing is double-counted. Other expenses (tolls,
 * etc.) are reported separately and are NOT part of the mandatory operational cost.
 */

const toNum = (d: { toString(): string } | null | undefined): number =>
  d == null ? 0 : Number(d);

export interface VehicleCostSummary {
  vehicleId: number;
  fuelCost: number;
  fuelLiters: number;
  maintenanceCost: number;
  operationalCost: number; // Fuel + Maintenance (the §3.7 definition)
  otherExpenses: number; // separate ledger (not part of operational cost)
}

export const costService = {
  async forVehicle(vehicleId: number): Promise<VehicleCostSummary> {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) throw NotFoundError("Vehicle not found");

    const [fuel, maintenance, expense] = await Promise.all([
      fuelRepository.aggregateByVehicle(vehicleId),
      maintenanceRepository.aggregateCostByVehicle(vehicleId),
      expenseRepository.aggregateByVehicle(vehicleId),
    ]);

    const fuelCost = toNum(fuel._sum.cost);
    const fuelLiters = toNum(fuel._sum.liters);
    const maintenanceCost = toNum(maintenance._sum.cost);
    const otherExpenses = toNum(expense._sum.amount);

    return {
      vehicleId,
      fuelCost,
      fuelLiters,
      maintenanceCost,
      operationalCost: fuelCost + maintenanceCost,
      otherExpenses,
    };
  },
};
