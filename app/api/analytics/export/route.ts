import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/http/handler";
import { requirePermission } from "@/lib/auth/guards";
import { analyticsService } from "@/lib/services/analytics.service";

export const dynamic = "force-dynamic";

/** Escapes a CSV cell (quotes fields containing comma, quote, or newline). */
function csvCell(value: string | number | null): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * GET /api/analytics/export?format=csv - per-vehicle analytics as a CSV download
 * (mandatory export, §4.8). Streams a text/csv attachment.
 */
export const GET = withErrorHandling(async (req) => {
  await requirePermission("reports", "read");

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "csv";
  const report = await analyticsService.getReport();

  const header = [
    "Registration",
    "Model",
    "Fuel Cost",
    "Fuel Liters",
    "Maintenance Cost",
    "Operational Cost",
    "Revenue",
    "Distance (km)",
    "Fuel Efficiency (km/l)",
    "ROI (%)",
  ];
  const rows = report.vehicles.map((v) => [
    v.registrationNumber,
    v.nameModel,
    v.fuelCost,
    v.fuelLiters,
    v.maintenanceCost,
    v.operationalCost,
    v.revenue,
    v.distance,
    v.fuelEfficiency ?? "N/A",
    v.roi ?? "N/A",
  ]);

  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");

  // (PDF export is a bonus; only CSV is mandatory. Unknown formats fall back to CSV.)
  void format;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="transitops-analytics.csv"',
    },
  });
});
