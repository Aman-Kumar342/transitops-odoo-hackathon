"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { StatusBadge, LicenseBadge } from "@/components/status-badge";
import { apiFetch, ApiError } from "@/lib/client/api";
import { can } from "@/lib/auth/rbac";
import { DRIVER_STATUS } from "@/lib/domain/driver";
import type { DriverDTO } from "@/lib/services/driver.service";

export default function DriverDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [role, setRole] = useState<string | null>(null);
  const [driver, setDriver] = useState<DriverDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  useEffect(() => {
    apiFetch<{ role: { name: string } }>("/api/auth/me")
      .then((me) => setRole(me.role.name))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDriver(await apiFetch<DriverDTO>(`/api/drivers/${id}`));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "notfound" : "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(path: string, body?: object) {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await apiFetch<DriverDTO>(`/api/drivers/${id}/${path}`, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      setDriver(updated);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);
    setActionError(null);
    try {
      await apiFetch(`/api/drivers/${id}`, { method: "DELETE" });
      router.push("/drivers");
      router.refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not deactivate.");
      setBusy(false);
    }
  }

  const canUpdate = role ? can(role, "drivers", "update") : false;
  const canDelete = role ? can(role, "drivers", "delete") : false;
  const s = driver?.status;

  return (
    <AppShell>
      <div className="container" style={{ maxWidth: 640 }}>
        <p style={{ marginBottom: "var(--space-2)" }}>
          <Link href="/drivers" style={{ fontSize: 14 }}>← Drivers</Link>
        </p>

        {loading ? (
          <LoadingState label="Loading driver…" />
        ) : error === "notfound" ? (
          <ErrorState title="Driver not found" message="It may have been deactivated." />
        ) : error ? (
          <ErrorState message="Could not load this driver." onRetry={load} />
        ) : driver ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <div>
                <h1 style={{ fontSize: 24, margin: 0 }}>{driver.name}</h1>
                <p style={{ color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                  {driver.licenseNumber} · {driver.licenseCategory}
                </p>
              </div>
              <StatusBadge status={driver.status} label={driver.statusLabel} />
            </div>

            <div className="card">
              <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "170px 1fr", rowGap: "var(--space-3)", alignItems: "center" }}>
                <Row label="License expiry"><LicenseBadge expiryDate={driver.licenseExpiryDate} expired={driver.licenseExpired} /></Row>
                <Row label="Dispatch-eligible">{driver.eligible ? "Yes" : "No"}</Row>
                <Row label="Safety score">{driver.safetyScore} / 100</Row>
                <Row label="Contact">{driver.contactNumber}</Row>
                <Row label="Registered">{new Date(driver.createdAt).toLocaleDateString()}</Row>
              </dl>
            </div>

            {(canUpdate || canDelete) && (
              <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {canUpdate && (
                  <Link href={`/drivers/${driver.id}/edit`} className="btn">Edit</Link>
                )}
                {canUpdate && s === DRIVER_STATUS.AVAILABLE && (
                  <button className="btn" disabled={busy} onClick={() => runAction("duty", { onDuty: false })}>Set Off Duty</button>
                )}
                {canUpdate && s === DRIVER_STATUS.OFF_DUTY && (
                  <button className="btn" disabled={busy} onClick={() => runAction("duty", { onDuty: true })}>Set Available</button>
                )}
                {canUpdate && (s === DRIVER_STATUS.AVAILABLE || s === DRIVER_STATUS.OFF_DUTY) && (
                  <button className="btn" disabled={busy} onClick={() => runAction("suspend")}>Suspend</button>
                )}
                {canUpdate && s === DRIVER_STATUS.SUSPENDED && (
                  <button className="btn btn--primary" disabled={busy} onClick={() => runAction("reinstate")}>Reinstate</button>
                )}
                {canDelete && s !== DRIVER_STATUS.ON_TRIP && !confirmDeactivate && (
                  <button className="btn" disabled={busy} onClick={() => setConfirmDeactivate(true)}>Deactivate</button>
                )}
                {s === DRIVER_STATUS.ON_TRIP && (
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)", alignSelf: "center" }}>
                    On Trip — complete or cancel the trip to change status.
                  </span>
                )}
              </div>
            )}

            {confirmDeactivate && (
              <div className="card" style={{ marginTop: "var(--space-3)", borderColor: "var(--color-danger)" }}>
                <p style={{ marginTop: 0 }}>
                  Deactivate <strong>{driver.name}</strong>? They will be removed from
                  active lists and the dispatch pool.
                </p>
                {actionError && <p style={{ color: "var(--color-danger)", fontSize: 14 }}>{actionError}</p>}
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button className="btn btn--primary" onClick={deactivate} disabled={busy}>
                    {busy ? "Deactivating…" : "Yes, deactivate"}
                  </button>
                  <button className="btn" onClick={() => setConfirmDeactivate(false)} disabled={busy}>Cancel</button>
                </div>
              </div>
            )}
            {!confirmDeactivate && actionError && (
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
