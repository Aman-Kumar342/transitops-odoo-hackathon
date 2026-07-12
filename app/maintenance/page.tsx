"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/status-badge";
import { apiFetch } from "@/lib/client/api";
import { can } from "@/lib/auth/rbac";
import { MAINTENANCE_STATUS, MAINTENANCE_STATUS_LABELS, type MaintenanceStatusValue } from "@/lib/domain/maintenance";
import type { MaintenanceDTO } from "@/lib/services/maintenance.service";

interface ListResponse {
  items: MaintenanceDTO[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function MaintenancePage() {
  const [role, setRole] = useState<string | null>(null);
  const [data, setData] = useState<ListResponse | null>(null);
  const [status, setStatus] = useState<"" | MaintenanceStatusValue>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch<{ role: { name: string } }>("/api/auth/me").then((me) => setRole(me.role.name)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    try {
      setData(await apiFetch<ListResponse>(`/api/maintenance?${params.toString()}`));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  const canCreate = role ? can(role, "maintenance", "create") : false;

  return (
    <AppShell>
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Maintenance</h1>
          {canCreate && <Link href="/maintenance/new" className="btn btn--primary">+ New record</Link>}
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
          <input placeholder="Search type…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} style={filterInput} />
          <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as MaintenanceStatusValue | ""); }} style={filterInput}>
            <option value="">All statuses</option>
            {Object.values(MAINTENANCE_STATUS).map((s) => <option key={s} value={s}>{MAINTENANCE_STATUS_LABELS[s]}</option>)}
          </select>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <LoadingState label="Loading maintenance records…" />
          ) : error ? (
            <ErrorState message="Could not load maintenance records." onRetry={load} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title="No maintenance records"
              message={status || search ? "Try adjusting your filters." : "Log a maintenance record to get started."}
              action={canCreate && !status && !search ? <Link href="/maintenance/new" className="btn btn--primary">+ New record</Link> : undefined}
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr><Th>Vehicle</Th><Th>Type</Th><Th>Cost</Th><Th>Opened</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {data.items.map((m) => (
                    <tr key={m.id}>
                      <Td><Link href={`/maintenance/${m.id}`} style={{ fontWeight: 600 }}>{m.vehicle.registrationNumber}</Link></Td>
                      <Td>{m.type}</Td>
                      <Td>{m.cost}</Td>
                      <Td>{new Date(m.openedAt).toLocaleDateString()}</Td>
                      <Td><StatusBadge status={m.status} label={m.statusLabel} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {data && data.pagination.totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
            <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
            <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Page {data.pagination.page} of {data.pagination.totalPages}</span>
            <button className="btn" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

const filterInput: React.CSSProperties = { padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", font: "inherit" };
function Th({ children }: { children: React.ReactNode }) { return <th style={{ textAlign: "left", padding: "var(--space-3)", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td style={{ padding: "var(--space-3)", borderBottom: "1px solid var(--color-border)" }}>{children}</td>; }
