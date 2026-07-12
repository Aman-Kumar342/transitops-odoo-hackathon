"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge, LicenseBadge } from "@/components/status-badge";
import { apiFetch } from "@/lib/client/api";
import { can } from "@/lib/auth/rbac";
import {
  DRIVER_STATUS,
  DRIVER_STATUS_LABELS,
  LICENSE_CATEGORIES,
  type DriverStatusValue,
} from "@/lib/domain/driver";
import type { DriverDTO } from "@/lib/services/driver.service";

interface ListResponse {
  items: DriverDTO[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function DriversPage() {
  const [role, setRole] = useState<string | null>(null);
  const [expiring, setExpiring] = useState<DriverDTO[]>([]);
  const [data, setData] = useState<ListResponse | null>(null);
  const [status, setStatus] = useState<"" | DriverStatusValue>("");
  const [category, setCategory] = useState("");
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch<{ role: { name: string } }>("/api/auth/me")
      .then((me) => setRole(me.role.name))
      .catch(() => {});
    apiFetch<DriverDTO[]>("/api/drivers/expiring-licenses?days=30")
      .then(setExpiring)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (status) params.set("status", status);
    if (category) params.set("licenseCategory", category);
    if (eligibleOnly) params.set("eligible", "true");
    if (search.trim()) params.set("search", search.trim());
    try {
      setData(await apiFetch<ListResponse>(`/api/drivers?${params.toString()}`));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, status, category, eligibleOnly, search]);

  useEffect(() => {
    load();
  }, [load]);

  const canCreate = role ? can(role, "drivers", "create") : false;

  return (
    <AppShell>
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Drivers</h1>
          {canCreate && (
            <Link href="/drivers/new" className="btn btn--primary">
              + New driver
            </Link>
          )}
        </div>

        {expiring.length > 0 && (
          <div
            className="card"
            style={{
              marginBottom: "var(--space-4)",
              borderColor: "var(--color-warning)",
              background: "rgba(183,121,31,0.08)",
            }}
          >
            <strong style={{ color: "var(--color-warning)" }}>
              ⚠ {expiring.length} driver{expiring.length > 1 ? "s" : ""} with licenses expiring soon or expired
            </strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
              {expiring.map((d) => (
                <Link
                  key={d.id}
                  href={`/drivers/${d.id}`}
                  style={{ fontSize: 13, padding: "2px 10px", borderRadius: 999, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  {d.name} — {d.licenseExpired ? "expired" : `expires ${d.licenseExpiryDate}`}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <input
            placeholder="Search name or license…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            style={filterInput}
          />
          <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as DriverStatusValue | ""); }} style={filterInput}>
            <option value="">All statuses</option>
            {Object.values(DRIVER_STATUS).map((s) => (
              <option key={s} value={s}>{DRIVER_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); }} style={filterInput}>
            <option value="">All categories</option>
            {LICENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--color-text-muted)" }}>
            <input type="checkbox" checked={eligibleOnly} onChange={(e) => { setPage(1); setEligibleOnly(e.target.checked); }} />
            Dispatch-eligible only
          </label>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <LoadingState label="Loading drivers…" />
          ) : error ? (
            <ErrorState message="Could not load drivers." onRetry={load} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title="No drivers found"
              message={search || status || category || eligibleOnly ? "Try adjusting your filters." : "Register your first driver to get started."}
              action={canCreate && !search && !status && !category && !eligibleOnly ? (
                <Link href="/drivers/new" className="btn btn--primary">+ New driver</Link>
              ) : undefined}
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>License</Th>
                    <Th>Category</Th>
                    <Th>Expiry</Th>
                    <Th>Safety</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((d) => (
                    <tr key={d.id}>
                      <Td>
                        <Link href={`/drivers/${d.id}`} style={{ fontWeight: 600 }}>{d.name}</Link>
                      </Td>
                      <Td>{d.licenseNumber}</Td>
                      <Td>{d.licenseCategory}</Td>
                      <Td><LicenseBadge expiryDate={d.licenseExpiryDate} expired={d.licenseExpired} /></Td>
                      <Td>{d.safetyScore}</Td>
                      <Td><StatusBadge status={d.status} label={d.statusLabel} /></Td>
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

const filterInput: React.CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  font: "inherit",
};

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign: "left", padding: "var(--space-3)", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "var(--space-3)", borderBottom: "1px solid var(--color-border)" }}>{children}</td>;
}
