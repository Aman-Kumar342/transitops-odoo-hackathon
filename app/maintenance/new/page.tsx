"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/ui/states";
import { createMaintenanceSchema } from "@/lib/validation/maintenance";
import { MAINTENANCE_TYPES } from "@/lib/domain/maintenance";
import { apiFetch, ApiError } from "@/lib/client/api";
import type { VehicleDTO } from "@/lib/services/vehicle.service";

export default function NewMaintenancePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleDTO[] | null>(null);
  const [form, setForm] = useState({ vehicleId: "", type: "", description: "", cost: "0", odometerAtService: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<VehicleDTO[]>("/api/vehicles/available").then(setVehicles).catch(() => setVehicles([]));
  }, []);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});
    const parsed = createMaintenanceSchema.safeParse(form);
    if (!parsed.success) {
      const m: Record<string, string> = {};
      for (const i of parsed.error.issues) { const k = i.path[0]; if (typeof k === "string" && !m[k]) m[k] = i.message; }
      setErrors(m);
      return;
    }
    setSubmitting(true);
    try {
      const rec = await apiFetch<{ id: number }>("/api/maintenance", { method: "POST", body: JSON.stringify(parsed.data) });
      router.push(`/maintenance/${rec.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.details)) if (v[0]) flat[k] = v[0];
        setErrors(flat);
      }
      setFormError(err instanceof ApiError ? err.message : "Could not open the maintenance record.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="container">
        <p style={{ marginBottom: "var(--space-2)" }}><Link href="/maintenance" style={{ fontSize: 14 }}>← Maintenance</Link></p>
        <h1 style={{ fontSize: 22 }}>New maintenance record</h1>
        {vehicles === null ? (
          <LoadingState label="Loading available vehicles…" />
        ) : (
          <form onSubmit={onSubmit} noValidate className="card" style={{ maxWidth: 560 }}>
            {vehicles.length === 0 && (
              <div style={{ background: "rgba(183,121,31,0.12)", color: "var(--color-warning)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-4)", fontSize: 14 }}>
                No available vehicles. Only vehicles that are Available (not On Trip, In Shop, or Retired) can be sent to maintenance.
              </div>
            )}
            <Field label="Vehicle (available only)" error={errors.vehicleId}>
              <select value={form.vehicleId} onChange={(e) => set("vehicleId", e.target.value)} style={inp(!!errors.vehicleId)}>
                <option value="">Select a vehicle…</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNumber} — {v.nameModel}</option>)}
              </select>
            </Field>
            <Field label="Type" error={errors.type}>
              <input list="maint-types" value={form.type} onChange={(e) => set("type", e.target.value)} placeholder="e.g. Oil Change" style={inp(!!errors.type)} />
              <datalist id="maint-types">{MAINTENANCE_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
            </Field>
            <Field label="Description (optional)" error={errors.description}>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} style={inp(!!errors.description)} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Field label="Cost" error={errors.cost}><input type="number" step="0.01" min="0" value={form.cost} onChange={(e) => set("cost", e.target.value)} style={inp(!!errors.cost)} /></Field>
              <Field label="Odometer at service (optional)" error={errors.odometerAtService}><input type="number" step="0.01" min="0" value={form.odometerAtService} onChange={(e) => set("odometerAtService", e.target.value)} style={inp(!!errors.odometerAtService)} /></Field>
            </div>
            {formError && <div role="alert" style={{ color: "var(--color-danger)", fontSize: 14, marginBottom: "var(--space-3)" }}>{formError}</div>}
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button type="submit" className="btn btn--primary" disabled={submitting || vehicles.length === 0}>{submitting ? "Opening…" : "Open maintenance"}</button>
              <button type="button" className="btn" onClick={() => router.back()}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: "var(--space-4)" }}>
      <span style={{ display: "block", marginBottom: "var(--space-1)", fontSize: 14 }}>{label}</span>
      {children}
      {error && <span style={{ color: "var(--color-danger)", fontSize: 12, display: "block", marginTop: 4 }}>{error}</span>}
    </label>
  );
}
function inp(hasError: boolean): React.CSSProperties {
  return { width: "100%", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", border: `1px solid ${hasError ? "var(--color-danger)" : "var(--color-border)"}`, background: "var(--color-bg)", color: "var(--color-text)", font: "inherit" };
}
