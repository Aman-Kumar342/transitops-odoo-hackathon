"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/status-badge";
import { apiFetch } from "@/lib/client/api";
import { VEHICLE_TYPES, VEHICLE_STATUS, VEHICLE_STATUS_LABELS, type VehicleStatusValue } from "@/lib/domain/vehicle";
import type { DashboardKpis } from "@/lib/services/dashboard.service";
import type { TripDTO } from "@/lib/services/trip.service";

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [trips, setTrips] = useState<TripDTO[] | null>(null);
  const [type, setType] = useState("");
  const [status, setStatus] = useState<"" | VehicleStatusValue>("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (region) params.set("region", region);
    try {
      const [k, t] = await Promise.all([
        apiFetch<DashboardKpis>(`/api/dashboard/kpis?${params.toString()}`),
        apiFetch<{ items: TripDTO[] }>("/api/trips?limit=8&sort=createdAt&order=desc"),
      ]);
      setKpis(k);
      setTrips(t.items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [type, status, region]);

  useEffect(() => { load(); }, [load]);

  const tiles = kpis
    ? [
        { label: "Active Vehicles", value: kpis.activeVehicles },
        { label: "Available Vehicles", value: kpis.availableVehicles },
        { label: "Vehicles in Maintenance", value: kpis.vehiclesInMaintenance },
        { label: "Active Trips", value: kpis.activeTrips },
        { label: "Pending Trips", value: kpis.pendingTrips },
        { label: "Drivers on Duty", value: kpis.driversOnDuty },
      ]
    : [];

  return (
    <AppShell>
      <div className="container">
        <h1 style={{ fontSize: 22, marginBottom: "var(--space-4)" }}>Dashboard</h1>

        {/* Filters */}
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
          <Filter label="Vehicle Type" value={type} onChange={setType} options={[["", "All"], ...VEHICLE_TYPES.map((t) => [t, t] as [string, string])]} />
          <Filter label="Status" value={status} onChange={(v) => setStatus(v as VehicleStatusValue | "")} options={[["", "All"], ...Object.values(VEHICLE_STATUS).map((s) => [s, VEHICLE_STATUS_LABELS[s]] as [string, string])]} />
          <Filter label="Region" value={region} onChange={setRegion} options={[["", "All"], ...(kpis?.regions ?? []).map((r) => [r, r] as [string, string])]} />
        </div>

        {loading && !kpis ? (
          <LoadingState label="Loading dashboard…" />
        ) : error ? (
          <ErrorState message="Could not load the dashboard." onRetry={load} />
        ) : kpis ? (
          <>
            {/* KPI tiles */}
            <div className="stat-grid">
              {tiles.map((t) => (
                <div key={t.label} className="card" style={{ padding: "var(--space-4)" }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>{t.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{t.value}</div>
                </div>
              ))}
              {/* Fleet utilization tile with bar */}
              <div className="card" style={{ padding: "var(--space-4)" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Fleet Utilization</div>
                <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4, color: "var(--color-primary)" }}>{kpis.fleetUtilization}%</div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--color-surface-2)", marginTop: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${kpis.fleetUtilization}%`, background: "var(--color-primary)" }} />
                </div>
              </div>
            </div>

            {/* Recent trips + status legend */}
            <div className="split-2" style={{ marginTop: "var(--space-5)" }}>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: 14 }}>Recent Trips</strong>
                  <Link href="/trips" style={{ fontSize: 13 }}>View all</Link>
                </div>
                {!trips || trips.length === 0 ? (
                  <EmptyState title="No trips yet" message="Create a trip to see it here." />
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                      <thead><tr><Th>Trip</Th><Th>Vehicle</Th><Th>Driver</Th><Th>Status</Th></tr></thead>
                      <tbody>
                        {trips.map((t) => (
                          <tr key={t.id}>
                            <Td><Link href={`/trips/${t.id}`}>TR{String(t.id).padStart(3, "0")}</Link></Td>
                            <Td>{t.vehicle.registrationNumber}</Td>
                            <Td>{t.driver.name}</Td>
                            <Td><StatusBadge status={t.status} label={t.statusLabel} /></Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card">
                <strong style={{ fontSize: 14 }}>Vehicle Status</strong>
                <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <Legend status="AVAILABLE" label="Available" count={kpis.statusBreakdown.available} />
                  <Legend status="ON_TRIP" label="On Trip" count={kpis.statusBreakdown.onTrip} />
                  <Legend status="IN_SHOP" label="In Shop" count={kpis.statusBreakdown.inShop} />
                  <Legend status="RETIRED" label="Retired" count={kpis.statusBreakdown.retired} />
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
      <span style={{ marginRight: 6 }}>{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", font: "inherit" }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function Legend({ status, label, count }: { status: string; label: string; count: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <StatusBadge status={status} label={label} />
      <strong>{count}</strong>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) { return <th style={{ textAlign: "left", padding: "var(--space-3)", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{children}</th>; }
function Td({ children }: { children?: React.ReactNode }) { return <td style={{ padding: "var(--space-3)", borderBottom: "1px solid var(--color-border)" }}>{children}</td>; }
