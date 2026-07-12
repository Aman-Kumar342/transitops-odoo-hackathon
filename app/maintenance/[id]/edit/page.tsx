"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { updateMaintenanceSchema } from "@/lib/validation/maintenance";
import { MAINTENANCE_TYPES } from "@/lib/domain/maintenance";
import { apiFetch, ApiError } from "@/lib/client/api";
import type { MaintenanceDTO } from "@/lib/services/maintenance.service";

export default function EditMaintenancePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "error">("loading");
  const [form, setForm] = useState({ type: "", description: "", cost: "", odometerAtService: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<MaintenanceDTO>(`/api/maintenance/${id}`)
      .then((m) => {
        setForm({
          type: m.type,
          description: m.description ?? "",
          cost: String(m.cost),
          odometerAtService: m.odometerAtService != null ? String(m.odometerAtService) : "",
        });
        setState("ready");
      })
      .catch((err) => setState(err instanceof ApiError && err.status === 404 ? "notfound" : "error"));
  }, [id]);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});
    const parsed = updateMaintenanceSchema.safeParse({
      type: form.type,
      description: form.description,
      cost: form.cost,
      odometerAtService: form.odometerAtService === "" ? undefined : form.odometerAtService,
    });
    if (!parsed.success) {
      const m: Record<string, string> = {};
      for (const i of parsed.error.issues) { const k = i.path[0]; if (typeof k === "string" && !m[k]) m[k] = i.message; }
      setErrors(m);
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/api/maintenance/${id}`, { method: "PUT", body: JSON.stringify(parsed.data) });
      router.push(`/maintenance/${id}`);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save the record.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="container">
        <p style={{ marginBottom: "var(--space-2)" }}><Link href={`/maintenance/${id}`} style={{ fontSize: 14 }}>← Record</Link></p>
        <h1 style={{ fontSize: 22 }}>Edit maintenance record</h1>
        {state === "loading" && <LoadingState label="Loading record…" />}
        {state === "notfound" && <ErrorState title="Record not found" />}
        {state === "error" && <ErrorState message="Could not load this record." />}
        {state === "ready" && (
          <form onSubmit={onSubmit} noValidate className="card" style={{ maxWidth: 560 }}>
            <Field label="Type" error={errors.type}>
              <input list="maint-types-edit" value={form.type} onChange={(e) => set("type", e.target.value)} style={inp(!!errors.type)} />
              <datalist id="maint-types-edit">{MAINTENANCE_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
            </Field>
            <Field label="Description" error={errors.description}>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} style={inp(!!errors.description)} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Field label="Cost" error={errors.cost}><input type="number" step="0.01" min="0" value={form.cost} onChange={(e) => set("cost", e.target.value)} style={inp(!!errors.cost)} /></Field>
              <Field label="Odometer at service" error={errors.odometerAtService}><input type="number" step="0.01" min="0" value={form.odometerAtService} onChange={(e) => set("odometerAtService", e.target.value)} style={inp(!!errors.odometerAtService)} /></Field>
            </div>
            {formError && <div role="alert" style={{ color: "var(--color-danger)", fontSize: 14, marginBottom: "var(--space-3)" }}>{formError}</div>}
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? "Saving…" : "Save changes"}</button>
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
