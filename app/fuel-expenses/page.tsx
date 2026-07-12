"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FuelSection } from "@/components/fuel-section";
import { ExpenseSection } from "@/components/expense-section";
import { apiFetch } from "@/lib/client/api";
import type { VehicleDTO } from "@/lib/services/vehicle.service";

/** Fuel & Expense Management (mockup screen 6): fuel logs + other expenses on one page. */
export default function FuelExpensesPage() {
  const [role, setRole] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<VehicleDTO[]>([]);

  useEffect(() => {
    apiFetch<{ role: { name: string } }>("/api/auth/me").then((m) => setRole(m.role.name)).catch(() => {});
    apiFetch<{ items: VehicleDTO[] }>("/api/vehicles?limit=100").then((r) => setVehicles(r.items)).catch(() => {});
  }, []);

  return (
    <AppShell>
      <div className="container">
        <h1 style={{ fontSize: 22, marginBottom: "var(--space-4)" }}>Fuel &amp; Expenses</h1>
        <FuelSection role={role} vehicles={vehicles} />
        <ExpenseSection role={role} vehicles={vehicles} />
        <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: "var(--space-5)" }}>
          Total operational cost (Fuel + Maintenance) is computed automatically per vehicle
          on each vehicle&apos;s detail page, and fleet-wide in Analytics.
        </p>
      </div>
    </AppShell>
  );
}
