"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { VehicleForm } from "@/components/vehicle-form";

export default function NewVehiclePage() {
  return (
    <AppShell>
      <div className="container">
        <p style={{ marginBottom: "var(--space-2)" }}>
          <Link href="/vehicles" style={{ fontSize: 14 }}>
            ← Vehicles
          </Link>
        </p>
        <h1 style={{ fontSize: 22 }}>New vehicle</h1>
        <VehicleForm mode="create" />
      </div>
    </AppShell>
  );
}
