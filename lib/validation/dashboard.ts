import { z } from "zod";
import { VEHICLE_TYPES, VEHICLE_STATUS } from "@/lib/domain/vehicle";

/** Dashboard KPI filters (problem.md §4.2, §13): vehicle type, status, region. */
export const dashboardQuerySchema = z.object({
  type: z.enum(VEHICLE_TYPES).optional(),
  status: z.nativeEnum(VEHICLE_STATUS).optional(),
  region: z.string().trim().min(1).optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
