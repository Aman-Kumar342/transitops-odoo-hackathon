"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FuelSection } from "@/components/fuel-section";
import { ExpenseSection } from "@/components/expense-section";
import { apiFetch } from "@/lib/client/api";
import type { VehicleDTO } from "@/lib/services/vehicle.service";

/** Fuel & Expense Management (mockup screen 6): fuel logs + other expenses on one page. */
interface CostSummary {
  operationalCost: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
}

export default function FuelExpensesPage() {
  const [role, setRole] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<VehicleDTO[]>([]);
  const [cost, setCost] = useState<CostSummary | null>(null);

  useEffect(() => {
    apiFetch<{ role: { name: string } }>("/api/auth/me").then((m) => setRole(m.role.name)).catch(() => {});
    apiFetch<{ items: VehicleDTO[] }>("/api/vehicles?limit=100").then((r) => setVehicles(r.items)).catch(() => {});
    apiFetch<{ summary: CostSummary }>("/api/analytics").then((r) => setCost(r.summary)).catch(() => {});
  }, []);

  return (
    <AppShell>
      <div className="container">
        <h1 style={{ fontSize: 22, marginBottom: "var(--space-4)" }}>Fuel &amp; Expenses</h1>

        {/* Fleet operational-cost summary strip (auto = Fuel + Maintenance) */}
        {cost && (
          <div
            className="card"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-4)",
              marginBottom: "var(--space-4)",
            }}
          >
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                Total Operational Cost (auto) = Fuel + Maintenance
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-primary)" }}>
                {cost.operationalCost.toLocaleString()}
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-5)", fontSize: 14 }}>
              <span><span style={{ color: "var(--color-text-muted)" }}>Fuel</span> <strong>{cost.totalFuelCost.toLocaleString()}</strong></span>
              <span><span style={{ color: "var(--color-text-muted)" }}>Maintenance</span> <strong>{cost.totalMaintenanceCost.toLocaleString()}</strong></span>
            </div>
          </div>
        )}

        <FuelSection role={role} vehicles={vehicles} />
        <ExpenseSection role={role} vehicles={vehicles} />
      </div>
    </AppShell>
  );
}
