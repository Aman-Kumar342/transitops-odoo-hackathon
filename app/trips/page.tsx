"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/status-badge";
import { DataTable, Td } from "@/components/data-table";
import { apiFetch } from "@/lib/client/api";
import { can } from "@/lib/auth/rbac";
import { TRIP_STATUS, TRIP_STATUS_LABELS, type TripStatusValue } from "@/lib/domain/trip";
import type { TripDTO } from "@/lib/services/trip.service";

interface ListResponse {
  items: TripDTO[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function TripsPage() {
  const [role, setRole] = useState<string | null>(null);
  const [data, setData] = useState<ListResponse | null>(null);
  const [status, setStatus] = useState<"" | TripStatusValue>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch<{ role: { name: string } }>("/api/auth/me")
      .then((me) => setRole(me.role.name))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    try {
      setData(await apiFetch<ListResponse>(`/api/trips?${params.toString()}`));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    load();
  }, [load]);

  const canCreate = role ? can(role, "trips", "create") : false;

  return (
    <AppShell>
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Trips</h1>
          {canCreate && <Link href="/trips/new" className="btn btn--primary">+ New trip</Link>}
        </div>

        {/* Status tabs */}
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
          <Tab active={status === ""} onClick={() => { setPage(1); setStatus(""); }}>All</Tab>
          {Object.values(TRIP_STATUS).map((s) => (
            <Tab key={s} active={status === s} onClick={() => { setPage(1); setStatus(s); }}>
              {TRIP_STATUS_LABELS[s]}
            </Tab>
          ))}
          <input placeholder="Search route…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} style={{ marginLeft: "auto", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", font: "inherit" }} />
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <LoadingState label="Loading trips…" />
          ) : error ? (
            <ErrorState message="Could not load trips." onRetry={load} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title="No trips found"
              message={status || search ? "Try adjusting your filters." : "Create your first trip to get started."}
              action={canCreate && !status && !search ? <Link href="/trips/new" className="btn btn--primary">+ New trip</Link> : undefined}
            />
          ) : (
            <DataTable headers={["Route", "Vehicle", "Driver", "Cargo", "Distance", "Note", "Status"]}>
              {data.items.map((t) => (
                <tr key={t.id}>
                  <Td><Link href={`/trips/${t.id}`} style={{ fontWeight: 600 }}>{t.source} → {t.destination}</Link></Td>
                  <Td>{t.vehicle.registrationNumber}</Td>
                  <Td>{t.driver.name}</Td>
                  <Td>{t.cargoWeight} kg</Td>
                  <Td>{t.plannedDistance} km</Td>
                  <Td><span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>{tripNote(t.status)}</span></Td>
                  <Td><StatusBadge status={t.status} label={t.statusLabel} /></Td>
                </tr>
              ))}
            </DataTable>
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

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="btn"
      style={{
        background: active ? "var(--color-primary)" : "var(--color-surface)",
        color: active ? "var(--color-primary-contrast)" : "var(--color-text)",
        borderColor: active ? "var(--color-primary)" : "var(--color-border)",
      }}
    >
      {children}
    </button>
  );
}

/** Short human note derived from trip status (Live Board hint). */
function tripNote(status: TripStatusValue): string {
  switch (status) {
    case TRIP_STATUS.DRAFT:
      return "Awaiting dispatch";
    case TRIP_STATUS.DISPATCHED:
      return "In transit";
    case TRIP_STATUS.COMPLETED:
      return "Delivered";
    case TRIP_STATUS.CANCELLED:
      return "Cancelled";
    default:
      return "";
  }
}
