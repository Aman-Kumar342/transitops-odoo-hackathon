"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/status-badge";
import { apiFetch } from "@/lib/client/api";
import { can } from "@/lib/auth/rbac";
import {
  VEHICLE_TYPES,
  VEHICLE_STATUS,
  VEHICLE_STATUS_LABELS,
  type VehicleStatusValue,
} from "@/lib/domain/vehicle";
import type { VehicleDTO } from "@/lib/services/vehicle.service";

interface ListResponse {
  items: VehicleDTO[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function VehiclesPage() {
  const [role, setRole] = useState<string | null>(null);
  const [data, setData] = useState<ListResponse | null>(null);
  const [status, setStatus] = useState<"" | VehicleStatusValue>("");
  const [type, setType] = useState("");
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
    if (type) params.set("type", type);
    if (search.trim()) params.set("search", search.trim());
    try {
      setData(await apiFetch<ListResponse>(`/api/vehicles?${params.toString()}`));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, status, type, search]);

  useEffect(() => {
    load();
  }, [load]);

  const canCreate = role ? can(role, "vehicles", "create") : false;

  return (
    <AppShell>
      <div className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-4)",
          }}
        >
          <h1 style={{ fontSize: 22, margin: 0 }}>Vehicles</h1>
          {canCreate && (
            <Link href="/vehicles/new" className="btn btn--primary">
              + New vehicle
            </Link>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            flexWrap: "wrap",
            marginBottom: "var(--space-4)",
          }}
        >
          <input
            placeholder="Search reg no or name…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            style={filterInput}
          />
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as VehicleStatusValue | "");
            }}
            style={filterInput}
          >
            <option value="">All statuses</option>
            {Object.values(VEHICLE_STATUS).map((s) => (
              <option key={s} value={s}>
                {VEHICLE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => {
              setPage(1);
              setType(e.target.value);
            }}
            style={filterInput}
          >
            <option value="">All types</option>
            {VEHICLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <LoadingState label="Loading vehicles…" />
          ) : error ? (
            <ErrorState message="Could not load vehicles." onRetry={load} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title="No vehicles found"
              message={
                search || status || type
                  ? "Try adjusting your filters."
                  : "Register your first vehicle to get started."
              }
              action={
                canCreate && !search && !status && !type ? (
                  <Link href="/vehicles/new" className="btn btn--primary">
                    + New vehicle
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Reg. no</Th>
                    <Th>Name / model</Th>
                    <Th>Type</Th>
                    <Th>Capacity</Th>
                    <Th>Odometer</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((v) => (
                    <tr key={v.id}>
                      <Td>
                        <Link href={`/vehicles/${v.id}`} style={{ fontWeight: 600 }}>
                          {v.registrationNumber}
                        </Link>
                      </Td>
                      <Td>{v.nameModel}</Td>
                      <Td>{v.type}</Td>
                      <Td>{v.maxLoadCapacity} kg</Td>
                      <Td>{v.odometer} km</Td>
                      <Td>
                        <StatusBadge status={v.status} label={v.statusLabel} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {data && data.pagination.totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "var(--space-3)",
              marginTop: "var(--space-4)",
            }}
          >
            <button
              className="btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
              Page {data.pagination.page} of {data.pagination.totalPages}
            </span>
            <button
              className="btn"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

const filterInput: React.CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  font: "inherit",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "var(--space-3)",
        borderBottom: "1px solid var(--color-border)",
        color: "var(--color-text-muted)",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "var(--space-3)", borderBottom: "1px solid var(--color-border)" }}>
      {children}
    </td>
  );
}
