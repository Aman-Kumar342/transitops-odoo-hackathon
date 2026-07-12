import type { Prisma } from "@prisma/client";
import { vehicleRepository } from "@/lib/repositories/vehicle.repository";
import { driverRepository } from "@/lib/repositories/driver.repository";
import { tripRepository } from "@/lib/repositories/trip.repository";
import { VEHICLE_STATUS } from "@/lib/domain/vehicle";
import { DRIVER_STATUS } from "@/lib/domain/driver";
import { TRIP_STATUS } from "@/lib/domain/trip";
import type { DashboardQuery } from "@/lib/validation/dashboard";

/**
 * Dashboard KPI aggregation (problem.md §4.2, §13). All counts are computed with SQL
 * COUNT (no app-side loops, §17). Filters (type/status/region) scope the vehicle set and
 * the vehicle-derived trip counts. Guards divide-by-zero on utilization.
 *
 * Drivers On Duty (§13, documented assumption) = drivers currently On Trip OR Available.
 * Kept as a single query so the definition is switchable in one place.
 */

export interface DashboardKpis {
  activeVehicles: number; // On Trip (§13)
  availableVehicles: number;
  vehiclesInMaintenance: number; // In Shop
  activeTrips: number; // Dispatched
  pendingTrips: number; // Draft
  driversOnDuty: number;
  fleetUtilization: number; // % = onTrip / (total - retired)
  statusBreakdown: { available: number; onTrip: number; inShop: number; retired: number };
  regions: string[];
}

export const dashboardService = {
  async getKpis(filters: DashboardQuery): Promise<DashboardKpis> {
    // Vehicle scope from filters.
    const vScope: Prisma.VehicleWhereInput = {};
    if (filters.type) vScope.type = filters.type;
    if (filters.region) vScope.region = { equals: filters.region, mode: "insensitive" };
    if (filters.status) vScope.status = filters.status;

    // Trip filter follows the vehicle's type/region (a trip's vehicle attributes).
    const tripVehicleScope: Prisma.VehicleWhereInput = {};
    if (filters.type) tripVehicleScope.type = filters.type;
    if (filters.region) tripVehicleScope.region = { equals: filters.region, mode: "insensitive" };
    const hasTripVehicleScope = filters.type !== undefined || filters.region !== undefined;

    const [
      onTrip,
      available,
      inShop,
      retired,
      totalNonRetired,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      regions,
    ] = await Promise.all([
      vehicleRepository.count({ ...vScope, status: VEHICLE_STATUS.ON_TRIP }),
      vehicleRepository.count({ ...vScope, status: VEHICLE_STATUS.AVAILABLE }),
      vehicleRepository.count({ ...vScope, status: VEHICLE_STATUS.IN_SHOP }),
      vehicleRepository.count({ ...vScope, status: VEHICLE_STATUS.RETIRED }),
      vehicleRepository.count({ ...vScope, status: { not: VEHICLE_STATUS.RETIRED } }),
      tripRepository.count({
        status: TRIP_STATUS.DISPATCHED,
        ...(hasTripVehicleScope ? { vehicle: tripVehicleScope } : {}),
      }),
      tripRepository.count({
        status: TRIP_STATUS.DRAFT,
        ...(hasTripVehicleScope ? { vehicle: tripVehicleScope } : {}),
      }),
      driverRepository.count({
        deletedAt: null,
        status: { in: [DRIVER_STATUS.ON_TRIP, DRIVER_STATUS.AVAILABLE] },
      }),
      vehicleRepository.distinctRegions(),
    ]);

    const fleetUtilization =
      totalNonRetired > 0 ? Math.round((onTrip / totalNonRetired) * 100) : 0;

    return {
      activeVehicles: onTrip,
      availableVehicles: available,
      vehiclesInMaintenance: inShop,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      fleetUtilization,
      statusBreakdown: { available, onTrip, inShop, retired },
      regions,
    };
  },
};
