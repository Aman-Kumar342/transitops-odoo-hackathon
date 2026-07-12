"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/states";
import { apiFetch, ApiError } from "@/lib/client/api";
import { can } from "@/lib/auth/rbac";
import { createFuelLogSchema, updateFuelLogSchema } from "@/lib/validation/fuel";
import type { FuelLogDTO } from "@/lib/services/fuel.service";
import type { VehicleDTO } from "@/lib/services/vehicle.service";

interface ListResponse {
  items: FuelLogDTO[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
const today = () => new Date().toISOString().slice(0, 10);

export function FuelSection({ role, vehicles }: { role: string | null; vehicles: VehicleDTO[] }) {
  const [data, setData] = useState<ListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<FuelLogDTO | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await apiFetch<ListResponse>(`/api/fuel-logs?page=${page}&limit=10`));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  const canCreate = role ? can(role, "fuel", "create") : false;
  const canUpdate = role ? can(role, "fuel", "update") : false;
  const canDelete = role ? can(role, "fuel", "delete") : false;

  async function remove(id: number) {
    await apiFetch(`/api/fuel-logs/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Fuel logs</h2>
        {canCreate && !editing && <button className="btn btn--primary" onClick={() => setEditing("new")}>+ Log fuel</button>}
      </div>

      {editing && (
        <FuelForm vehicles={vehicles} record={editing === "new" ? null : editing} onDone={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: "var(--space-3)" }}>
        {loading ? <LoadingState label="Loading fuel logs…" />
          : error ? <ErrorState message="Could not load fuel logs." onRetry={load} />
          : !data || data.items.length === 0 ? <EmptyState title="No fuel logs" message="Record fuel purchases to track cost and efficiency." />
          : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr><Th>Vehicle</Th><Th>Date</Th><Th>Liters</Th><Th>Fuel cost</Th><Th>Odometer</Th><Th /></tr></thead>
                <tbody>
                  {data.items.map((f) => (
                    <tr key={f.id}>
                      <Td>{f.vehicle.registrationNumber}</Td><Td>{f.date}</Td><Td>{f.liters} L</Td><Td>{f.cost}</Td><Td>{f.odometer ?? "—"}</Td>
                      <Td><span style={{ display: "flex", gap: 8 }}>
                        {canUpdate && <button className="btn" style={{ padding: "2px 8px" }} onClick={() => setEditing(f)}>Edit</button>}
                        {canDelete && <button className="btn" style={{ padding: "2px 8px" }} onClick={() => remove(f.id)}>Delete</button>}
                      </span></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
      {data && data.pagination.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
          <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Page {data.pagination.page} of {data.pagination.totalPages}</span>
          <button className="btn" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </section>
  );
}

function FuelForm({ vehicles, record, onDone, onCancel }: { vehicles: VehicleDTO[]; record: FuelLogDTO | null; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    vehicleId: record ? String(record.vehicle.id) : "",
    liters: record ? String(record.liters) : "",
    cost: record ? String(record.cost) : "",
    date: record ? record.date : today(),
    odometer: record?.odometer != null ? String(record.odometer) : "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({}); setFormError(null);
    const schema = record ? updateFuelLogSchema : createFuelLogSchema;
    const payload = record ? { liters: form.liters, cost: form.cost, date: form.date, odometer: form.odometer || undefined } : { ...form, odometer: form.odometer || undefined };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const m: Record<string, string> = {};
      for (const i of parsed.error.issues) { const k = i.path[0]; if (typeof k === "string" && !m[k]) m[k] = i.message; }
      setErrors(m); return;
    }
    setSaving(true);
    try {
      await apiFetch(record ? `/api/fuel-logs/${record.id}` : "/api/fuel-logs", { method: record ? "PUT" : "POST", body: JSON.stringify(parsed.data) });
      onDone();
    } catch (err) { setFormError(err instanceof ApiError ? err.message : "Could not save."); setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="card" style={{ marginTop: "var(--space-3)" }}>
      <h3 style={{ fontSize: 15, marginTop: 0 }}>{record ? "Edit fuel log" : "Log fuel"}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "var(--space-3)" }}>
        {!record && <L label="Vehicle" err={errors.vehicleId}><select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} style={ci(!!errors.vehicleId)}><option value="">Select…</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNumber}</option>)}</select></L>}
        <L label="Date" err={errors.date}><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={ci(!!errors.date)} /></L>
        <L label="Liters" err={errors.liters}><input type="number" step="0.01" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} style={ci(!!errors.liters)} /></L>
        <L label="Cost" err={errors.cost}><input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} style={ci(!!errors.cost)} /></L>
        <L label="Odometer" err={errors.odometer}><input type="number" step="0.01" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} style={ci(!!errors.odometer)} /></L>
      </div>
      {formError && <p style={{ color: "var(--color-danger)", fontSize: 14 }}>{formError}</p>}
      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function L({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return (<label style={{ display: "block" }}><span style={{ display: "block", marginBottom: "var(--space-1)", fontSize: 13 }}>{label}</span>{children}{err && <span style={{ color: "var(--color-danger)", fontSize: 12, display: "block", marginTop: 4 }}>{err}</span>}</label>);
}
function ci(e: boolean): React.CSSProperties {
  return { width: "100%", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", border: `1px solid ${e ? "var(--color-danger)" : "var(--color-border)"}`, background: "var(--color-bg)", color: "var(--color-text)", font: "inherit" };
}
function Th({ children }: { children?: React.ReactNode }) { return <th style={{ textAlign: "left", padding: "var(--space-3)", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{children}</th>; }
function Td({ children }: { children?: React.ReactNode }) { return <td style={{ padding: "var(--space-3)", borderBottom: "1px solid var(--color-border)" }}>{children}</td>; }
