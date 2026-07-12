import { vehicleRepository } from "@/lib/repositories/vehicle.repository";
import { fuelRepository } from "@/lib/repositories/fuel.repository";
import { maintenanceRepository } from "@/lib/repositories/maintenance.repository";
import { tripRepository } from "@/lib/repositories/trip.repository";
import { VEHICLE_STATUS } from "@/lib/domain/vehicle";

/**
 * Reports & Analytics (problem.md §4.8, §14, §18-F). All figures are computed from SQL
 * aggregates (groupBy / count) merged app-side over the vehicle list - a fixed, small
 * number of queries (no N+1, §17). Every ratio guards divide-by-zero and returns null
 * ("N/A" in the UI) rather than NaN/Infinity.
 *
 *   Fuel Efficiency  = Distance / Fuel (km/l)   [Distance = Σ planned_distance of
 *                      completed trips 🟨; Fuel = Σ fuel_logs liters]
 *   Operational Cost = Σ fuel cost + Σ maintenance cost           (§18-E)
 *   Vehicle ROI      = (Revenue − (Maintenance + Fuel)) / Acquisition Cost   (§18-F)
 *                      Revenue = Σ revenue of that vehicle's completed trips
 */

const toNum = (d: { toString(): string } | null | undefined): number =>
  d == null ? 0 : Number(d);
const round = (n: number, dp = 2): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

export interface VehicleAnalytics {
  vehicleId: number;
  registrationNumber: string;
  nameModel: string;
  fuelCost: number;
  fuelLiters: number;
  maintenanceCost: number;
  operationalCost: number;
  revenue: number;
  distance: number;
  acquisitionCost: number;
  fuelEfficiency: number | null; // km/l, null if no fuel
  roi: number | null; // %, null if acquisition cost is 0
}

export interface AnalyticsReport {
  summary: {
    fuelEfficiency: number | null;
    fleetUtilization: number;
    operationalCost: number;
    roi: number | null;
    totalRevenue: number;
    totalFuelCost: number;
    totalMaintenanceCost: number;
    totalAcquisitionCost: number;
  };
  vehicles: VehicleAnalytics[]; // sorted by operational cost desc (top costliest first)
  monthlyRevenue: { month: string; revenue: number }[];
}

export const analyticsService = {
  async getReport(): Promise<AnalyticsReport> {
    const [vehicles, fuelGroups, maintGroups, tripGroups, onTrip, nonRetired, revenueSeries] =
      await Promise.all([
        vehicleRepository.findMany({ where: {}, orderBy: { id: "asc" }, skip: 0, take: 1000 }),
        fuelRepository.groupByVehicle(),
        maintenanceRepository.groupCostByVehicle(),
        tripRepository.groupCompletedByVehicle(),
        vehicleRepository.count({ status: VEHICLE_STATUS.ON_TRIP }),
        vehicleRepository.count({ status: { not: VEHICLE_STATUS.RETIRED } }),
        tripRepository.completedRevenueSeries(),
      ]);

    const fuelBy = new Map(fuelGroups.map((g) => [g.vehicleId, g._sum]));
    const maintBy = new Map(maintGroups.map((g) => [g.vehicleId, g._sum]));
    const tripBy = new Map(tripGroups.map((g) => [g.vehicleId, g._sum]));

    const perVehicle: VehicleAnalytics[] = vehicles.map((v) => {
      const fuelCost = toNum(fuelBy.get(v.id)?.cost);
      const fuelLiters = toNum(fuelBy.get(v.id)?.liters);
      const maintenanceCost = toNum(maintBy.get(v.id)?.cost);
      const revenue = toNum(tripBy.get(v.id)?.revenue);
      const distance = toNum(tripBy.get(v.id)?.plannedDistance);
      const acquisitionCost = toNum(v.acquisitionCost);
      const operationalCost = fuelCost + maintenanceCost;
      return {
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        nameModel: v.nameModel,
        fuelCost,
        fuelLiters,
        maintenanceCost,
        operationalCost,
        revenue,
        distance,
        acquisitionCost,
        fuelEfficiency: fuelLiters > 0 ? round(distance / fuelLiters, 2) : null,
        roi: acquisitionCost > 0 ? round(((revenue - operationalCost) / acquisitionCost) * 100, 1) : null,
      };
    });

    // Fleet totals.
    const totalFuelCost = sum(perVehicle, (p) => p.fuelCost);
    const totalFuelLiters = sum(perVehicle, (p) => p.fuelLiters);
    const totalMaintenanceCost = sum(perVehicle, (p) => p.maintenanceCost);
    const totalRevenue = sum(perVehicle, (p) => p.revenue);
    const totalDistance = sum(perVehicle, (p) => p.distance);
    const totalAcquisitionCost = sum(perVehicle, (p) => p.acquisitionCost);
    const operationalCost = totalFuelCost + totalMaintenanceCost;

    return {
      summary: {
        fuelEfficiency: totalFuelLiters > 0 ? round(totalDistance / totalFuelLiters, 2) : null,
        fleetUtilization: nonRetired > 0 ? Math.round((onTrip / nonRetired) * 100) : 0,
        operationalCost,
        roi: totalAcquisitionCost > 0 ? round(((totalRevenue - operationalCost) / totalAcquisitionCost) * 100, 1) : null,
        totalRevenue,
        totalFuelCost,
        totalMaintenanceCost,
        totalAcquisitionCost,
      },
      vehicles: [...perVehicle].sort((a, b) => b.operationalCost - a.operationalCost),
      monthlyRevenue: buildMonthlyRevenue(revenueSeries),
    };
  },
};

function sum<T>(arr: T[], f: (t: T) => number): number {
  return arr.reduce((acc, t) => acc + f(t), 0);
}

/** Groups completed-trip revenue into the last 6 calendar months (including zeros). */
function buildMonthlyRevenue(
  series: { revenue: { toString(): string } | null; completedAt: Date | null }[],
): { month: string; revenue: number }[] {
  const byMonth = new Map<string, number>();
  for (const row of series) {
    if (!row.completedAt) continue;
    const key = row.completedAt.toISOString().slice(0, 7); // YYYY-MM
    byMonth.set(key, (byMonth.get(key) ?? 0) + toNum(row.revenue));
  }
  const now = new Date();
  const months: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    months.push({ month: key, revenue: round(byMonth.get(key) ?? 0, 2) });
  }
  return months;
}
