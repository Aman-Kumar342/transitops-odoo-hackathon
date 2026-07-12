"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/status-badge";
import { apiFetch, ApiError } from "@/lib/client/api";
import { can } from "@/lib/auth/rbac";
import { VEHICLE_STATUS } from "@/lib/domain/vehicle";
import type { VehicleDTO } from "@/lib/services/vehicle.service";

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [role, setRole] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<VehicleDTO | null>(null);
  const [cost, setCost] = useState<{ fuelCost: number; maintenanceCost: number; operationalCost: number; otherExpenses: number; fuelLiters: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmRetire, setConfirmRetire] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ role: { name: string } }>("/api/auth/me")
      .then((me) => setRole(me.role.name))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setVehicle(await apiFetch<VehicleDTO>(`/api/vehicles/${id}`));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "notfound" : "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiFetch<typeof cost>(`/api/vehicles/${id}/operational-cost`).then(setCost).catch(() => {});
  }, [id]);

  async function retire() {
    setRetiring(true);
    setActionError(null);
    try {
      const updated = await apiFetch<VehicleDTO>(`/api/vehicles/${id}`, { method: "DELETE" });
      setVehicle(updated);
      setConfirmRetire(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not retire the vehicle.");
    } finally {
      setRetiring(false);
    }
  }

  const canUpdate = role ? can(role, "vehicles", "update") : false;
  const canDelete = role ? can(role, "vehicles", "delete") : false;
  const isRetired = vehicle?.status === VEHICLE_STATUS.RETIRED;
  const isOnTrip = vehicle?.status === VEHICLE_STATUS.ON_TRIP;

  return (
    <AppShell>
      <div className="container" style={{ maxWidth: 640 }}>
        <p style={{ marginBottom: "var(--space-2)" }}>
          <Link href="/vehicles" style={{ fontSize: 14 }}>
            ← Vehicles
          </Link>
        </p>

        {loading ? (
          <LoadingState label="Loading vehicle…" />
        ) : error === "notfound" ? (
          <ErrorState title="Vehicle not found" message="It may have been removed." />
        ) : error ? (
          <ErrorState message="Could not load this vehicle." onRetry={load} />
        ) : vehicle ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--space-3)",
                marginBottom: "var(--space-4)",
              }}
            >
              <div>
                <h1 style={{ fontSize: 24, margin: 0 }}>{vehicle.registrationNumber}</h1>
                <p style={{ color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                  {vehicle.nameModel}
                </p>
              </div>
              <StatusBadge status={vehicle.status} label={vehicle.statusLabel} />
            </div>

            <div className="card">
              <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "160px 1fr", rowGap: "var(--space-3)" }}>
                <Row label="Type" value={vehicle.type} />
                <Row label="Max load capacity" value={`${vehicle.maxLoadCapacity} kg`} />
                <Row label="Odometer" value={`${vehicle.odometer} km`} />
                <Row label="Acquisition cost" value={String(vehicle.acquisitionCost)} />
                <Row label="Region" value={vehicle.region ?? "—"} />
                <Row label="Registered" value={new Date(vehicle.createdAt).toLocaleDateString()} />
                {vehicle.retiredAt && (
                  <Row label="Retired" value={new Date(vehicle.retiredAt).toLocaleDateString()} />
                )}
              </dl>
            </div>

            {cost && (
              <div className="card" style={{ marginTop: "var(--space-3)" }}>
                <h2 style={{ fontSize: 14, marginTop: 0, color: "var(--color-text-muted)" }}>
                  Operational cost (Fuel + Maintenance)
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-3)" }}>
                  <Stat label="Operational" value={cost.operationalCost} emphasis />
                  <Stat label="Fuel" value={cost.fuelCost} />
                  <Stat label="Maintenance" value={cost.maintenanceCost} />
                  <Stat label="Other expenses" value={cost.otherExpenses} muted />
                  <Stat label="Fuel (L)" value={cost.fuelLiters} muted />
                </div>
              </div>
            )}

            {(canUpdate || canDelete) && !isRetired && (
              <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {canUpdate && (
                  <Link href={`/vehicles/${vehicle.id}/edit`} className="btn">
                    Edit
                  </Link>
                )}
                {canDelete && !confirmRetire && (
                  <button
                    className="btn"
                    onClick={() => setConfirmRetire(true)}
                    disabled={isOnTrip}
                    title={isOnTrip ? "Complete or cancel the trip first" : "Retire this vehicle"}
                  >
                    Retire
                  </button>
                )}
              </div>
            )}

            {confirmRetire && (
              <div className="card" style={{ marginTop: "var(--space-3)", borderColor: "var(--color-danger)" }}>
                <p style={{ marginTop: 0 }}>
                  Retire <strong>{vehicle.registrationNumber}</strong>? It will be removed
                  from the dispatch pool. This cannot be undone.
                </p>
                {actionError && (
                  <p style={{ color: "var(--color-danger)", fontSize: 14 }}>{actionError}</p>
                )}
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button className="btn btn--primary" onClick={retire} disabled={retiring}>
                    {retiring ? "Retiring…" : "Yes, retire"}
                  </button>
                  <button className="btn" onClick={() => setConfirmRetire(false)} disabled={retiring}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {!confirmRetire && actionError && (
              <p style={{ color: "var(--color-danger)", fontSize: 14, marginTop: "var(--space-3)" }}>
                {actionError}
              </p>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{label}</dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </>
  );
}

function Stat({ label, value, emphasis, muted }: { label: string; value: number; emphasis?: boolean; muted?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{label}</div>
      <div style={{ fontSize: emphasis ? 22 : 18, fontWeight: emphasis ? 700 : 600, color: muted ? "var(--color-text-muted)" : "var(--color-text)" }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
