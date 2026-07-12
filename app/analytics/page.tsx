"use client";

import { AppShell } from "@/components/app-shell";

/** Analytics (mockup screen 7). KPI cards, ROI, and charts are built in Phase 8. */
export default function AnalyticsPage() {
  return (
    <AppShell>
      <div className="container">
        <h1 style={{ fontSize: 22 }}>Analytics</h1>
        <div className="card" style={{ maxWidth: 520, color: "var(--color-text-muted)" }}>
          Fuel efficiency, fleet utilization, operational cost, and vehicle ROI (with CSV
          export) are being built here.
        </div>
      </div>
    </AppShell>
  );
}
