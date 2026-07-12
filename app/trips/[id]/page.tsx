"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/status-badge";
import { apiFetch, ApiError } from "@/lib/client/api";
import { can } from "@/lib/auth/rbac";
import { TRIP_STATUS } from "@/lib/domain/trip";
import { completeTripSchema } from "@/lib/validation/trip";
import type { TripDTO } from "@/lib/services/trip.service";

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [role, setRole] = useState<string | null>(null);
  const [trip, setTrip] = useState<TripDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "dispatch" | "cancel">(null);
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    apiFetch<{ role: { name: string } }>("/api/auth/me").then((me) => setRole(me.role.name)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTrip(await apiFetch<TripDTO>(`/api/trips/${id}`));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "notfound" : "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function runAction(path: string) {
    setBusy(true);
    setActionError(null);
    try {
      setTrip(await apiFetch<TripDTO>(`/api/trips/${id}/${path}`, { method: "POST" }));
      setConfirm(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const canUpdate = role ? can(role, "trips", "update") : false;
  const s = trip?.status;

  return (
    <AppShell>
      <div className="container" style={{ maxWidth: 680 }}>
        <p style={{ marginBottom: "var(--space-2)" }}>
          <Link href="/trips" style={{ fontSize: 14 }}>← Trips</Link>
        </p>

        {loading ? (
          <LoadingState label="Loading trip…" />
        ) : error === "notfound" ? (
          <ErrorState title="Trip not found" />
        ) : error ? (
          <ErrorState message="Could not load this trip." onRetry={load} />
        ) : trip ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <h1 style={{ fontSize: 22, margin: 0 }}>{trip.source} → {trip.destination}</h1>
              <StatusBadge status={trip.status} label={trip.statusLabel} />
            </div>

            <div className="card">
              <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "170px 1fr", rowGap: "var(--space-3)" }}>
                <Row label="Vehicle"><Link href={`/vehicles/${trip.vehicle.id}`}>{trip.vehicle.registrationNumber} ({trip.vehicle.nameModel})</Link></Row>
                <Row label="Driver"><Link href={`/drivers/${trip.driver.id}`}>{trip.driver.name}</Link></Row>
                <Row label="Cargo weight">{trip.cargoWeight} kg</Row>
                <Row label="Planned distance">{trip.plannedDistance} km</Row>
                {trip.startOdometer != null && <Row label="Start odometer">{trip.startOdometer} km</Row>}
                {trip.finalOdometer != null && <Row label="Final odometer">{trip.finalOdometer} km</Row>}
                {trip.fuelConsumed != null && <Row label="Fuel consumed">{trip.fuelConsumed} L</Row>}
                {trip.revenue != null && <Row label="Revenue">{trip.revenue}</Row>}
              </dl>
            </div>

            {/* Timeline */}
            <div className="card" style={{ marginTop: "var(--space-3)" }}>
              <h2 style={{ fontSize: 14, marginTop: 0, color: "var(--color-text-muted)" }}>Timeline</h2>
              <ul style={{ margin: 0, paddingLeft: "var(--space-5)", fontSize: 14 }}>
                <li>Created: {new Date(trip.createdAt).toLocaleString()}</li>
                {trip.dispatchedAt && <li>Dispatched: {new Date(trip.dispatchedAt).toLocaleString()}</li>}
                {trip.completedAt && <li>Completed: {new Date(trip.completedAt).toLocaleString()}</li>}
                {trip.cancelledAt && <li>Cancelled: {new Date(trip.cancelledAt).toLocaleString()}</li>}
              </ul>
            </div>

            {/* Actions */}
            {canUpdate && (s === TRIP_STATUS.DRAFT || s === TRIP_STATUS.DISPATCHED) && (
              <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {s === TRIP_STATUS.DRAFT && (
                  <>
                    <Link href={`/trips/${trip.id}/edit`} className="btn">Edit</Link>
                    <button className="btn btn--primary" disabled={busy} onClick={() => setConfirm("dispatch")}>Dispatch</button>
                  </>
                )}
                {s === TRIP_STATUS.DISPATCHED && (
                  <button className="btn btn--primary" disabled={busy} onClick={() => setShowComplete(true)}>Complete</button>
                )}
                <button className="btn" disabled={busy} onClick={() => setConfirm("cancel")}>Cancel trip</button>
              </div>
            )}

            {confirm && (
              <ConfirmBox
                text={confirm === "dispatch"
                  ? "Dispatch this trip? The vehicle and driver will be marked On Trip."
                  : "Cancel this trip? " + (s === TRIP_STATUS.DISPATCHED ? "The vehicle and driver will return to Available." : "")}
                busy={busy}
                error={actionError}
                onConfirm={() => runAction(confirm)}
                onCancel={() => { setConfirm(null); setActionError(null); }}
              />
            )}

            {showComplete && (
              <CompleteForm
                busy={busy}
                onCancel={() => setShowComplete(false)}
                onSubmit={async (payload) => {
                  setBusy(true);
                  setActionError(null);
                  try {
                    setTrip(await apiFetch<TripDTO>(`/api/trips/${id}/complete`, { method: "POST", body: JSON.stringify(payload) }));
                    setShowComplete(false);
                  } catch (err) {
                    setActionError(err instanceof ApiError ? err.message : "Could not complete the trip.");
                  } finally {
                    setBusy(false);
                  }
                }}
                error={actionError}
              />
            )}

            {!confirm && !showComplete && actionError && (
              <p style={{ color: "var(--color-danger)", fontSize: 14, marginTop: "var(--space-3)" }}>{actionError}</p>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{label}</dt>
      <dd style={{ margin: 0 }}>{children}</dd>
    </>
  );
}

function ConfirmBox({ text, busy, error, onConfirm, onCancel }: { text: string; busy: boolean; error: string | null; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="card" style={{ marginTop: "var(--space-3)", borderColor: "var(--color-border)" }}>
      <p style={{ marginTop: 0 }}>{text}</p>
      {error && <p style={{ color: "var(--color-danger)", fontSize: 14 }}>{error}</p>}
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button className="btn btn--primary" onClick={onConfirm} disabled={busy}>{busy ? "Working…" : "Confirm"}</button>
        <button className="btn" onClick={onCancel} disabled={busy}>Back</button>
      </div>
    </div>
  );
}

function CompleteForm({ busy, error, onSubmit, onCancel }: {
  busy: boolean;
  error: string | null;
  onSubmit: (p: { finalOdometer: number; fuelConsumed: number; revenue?: number }) => void;
  onCancel: () => void;
}) {
  const [finalOdometer, setFinal] = useState("");
  const [fuelConsumed, setFuel] = useState("");
  const [revenue, setRevenue] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = completeTripSchema.safeParse({ finalOdometer, fuelConsumed, revenue: revenue === "" ? undefined : revenue });
    if (!parsed.success) {
      const m: Record<string, string> = {};
      for (const i of parsed.error.issues) { const k = i.path[0]; if (typeof k === "string" && !m[k]) m[k] = i.message; }
      setErrs(m);
      return;
    }
    setErrs({});
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={submit} className="card" style={{ marginTop: "var(--space-3)" }}>
      <h2 style={{ fontSize: 16, marginTop: 0 }}>Complete trip</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
        <F label="Final odometer (km)" err={errs.finalOdometer}><input type="number" step="0.01" value={finalOdometer} onChange={(e) => setFinal(e.target.value)} style={ci(!!errs.finalOdometer)} /></F>
        <F label="Fuel consumed (L)" err={errs.fuelConsumed}><input type="number" step="0.01" value={fuelConsumed} onChange={(e) => setFuel(e.target.value)} style={ci(!!errs.fuelConsumed)} /></F>
        <F label="Revenue (optional)" err={errs.revenue}><input type="number" step="0.01" value={revenue} onChange={(e) => setRevenue(e.target.value)} style={ci(!!errs.revenue)} /></F>
      </div>
      {error && <p style={{ color: "var(--color-danger)", fontSize: 14 }}>{error}</p>}
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Completing…" : "Complete trip"}</button>
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>Back</button>
      </div>
    </form>
  );
}

function F({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", marginBottom: "var(--space-1)", fontSize: 13 }}>{label}</span>
      {children}
      {err && <span style={{ color: "var(--color-danger)", fontSize: 12, display: "block", marginTop: 4 }}>{err}</span>}
    </label>
  );
}
function ci(hasError: boolean): React.CSSProperties {
  return { width: "100%", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", border: `1px solid ${hasError ? "var(--color-danger)" : "var(--color-border)"}`, background: "var(--color-bg)", color: "var(--color-text)", font: "inherit" };
}
