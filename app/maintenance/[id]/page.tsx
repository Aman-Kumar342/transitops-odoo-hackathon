"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/status-badge";
import { apiFetch, ApiError } from "@/lib/client/api";
import { can } from "@/lib/auth/rbac";
import { MAINTENANCE_STATUS } from "@/lib/domain/maintenance";
import type { MaintenanceDTO } from "@/lib/services/maintenance.service";

export default function MaintenanceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [role, setRole] = useState<string | null>(null);
  const [record, setRecord] = useState<MaintenanceDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    apiFetch<{ role: { name: string } }>("/api/auth/me").then((me) => setRole(me.role.name)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecord(await apiFetch<MaintenanceDTO>(`/api/maintenance/${id}`));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "notfound" : "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function close() {
    setBusy(true);
    setActionError(null);
    try {
      setRecord(await apiFetch<MaintenanceDTO>(`/api/maintenance/${id}/close`, { method: "POST" }));
      setConfirmClose(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not close the record.");
    } finally {
      setBusy(false);
    }
  }

  const canUpdate = role ? can(role, "maintenance", "update") : false;
  const isOpen = record?.status === MAINTENANCE_STATUS.OPEN;

  return (
    <AppShell>
      <div className="container" style={{ maxWidth: 640 }}>
        <p style={{ marginBottom: "var(--space-2)" }}><Link href="/maintenance" style={{ fontSize: 14 }}>← Maintenance</Link></p>

        {loading ? (
          <LoadingState label="Loading record…" />
        ) : error === "notfound" ? (
          <ErrorState title="Record not found" />
        ) : error ? (
          <ErrorState message="Could not load this record." onRetry={load} />
        ) : record ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <div>
                <h1 style={{ fontSize: 22, margin: 0 }}>{record.type}</h1>
                <p style={{ color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                  <Link href={`/vehicles/${record.vehicle.id}`}>{record.vehicle.registrationNumber}</Link> · {record.vehicle.nameModel}
                </p>
              </div>
              <StatusBadge status={record.status} label={record.statusLabel} />
            </div>

            <div className="card">
              <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "170px 1fr", rowGap: "var(--space-3)" }}>
                <Row label="Cost">{record.cost}</Row>
                {record.odometerAtService != null && <Row label="Odometer at service">{record.odometerAtService} km</Row>}
                {record.description && <Row label="Description">{record.description}</Row>}
                <Row label="Opened">{new Date(record.openedAt).toLocaleString()}</Row>
                {record.closedAt && <Row label="Closed">{new Date(record.closedAt).toLocaleString()}</Row>}
              </dl>
            </div>

            {canUpdate && isOpen && (
              <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <Link href={`/maintenance/${record.id}/edit`} className="btn">Edit</Link>
                {!confirmClose && <button className="btn btn--primary" disabled={busy} onClick={() => setConfirmClose(true)}>Close record</button>}
              </div>
            )}

            {confirmClose && (
              <div className="card" style={{ marginTop: "var(--space-3)" }}>
                <p style={{ marginTop: 0 }}>
                  Close this record? The vehicle <strong>{record.vehicle.registrationNumber}</strong> will
                  return to Available (unless it has been retired).
                </p>
                {actionError && <p style={{ color: "var(--color-danger)", fontSize: 14 }}>{actionError}</p>}
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button className="btn btn--primary" onClick={close} disabled={busy}>{busy ? "Closing…" : "Yes, close"}</button>
                  <button className="btn" onClick={() => setConfirmClose(false)} disabled={busy}>Back</button>
                </div>
              </div>
            )}
            {!confirmClose && actionError && <p style={{ color: "var(--color-danger)", fontSize: 14, marginTop: "var(--space-3)" }}>{actionError}</p>}
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
