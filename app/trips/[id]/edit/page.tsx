"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { updateTripSchema } from "@/lib/validation/trip";
import { apiFetch, ApiError } from "@/lib/client/api";
import { TRIP_STATUS } from "@/lib/domain/trip";
import type { TripDTO } from "@/lib/services/trip.service";

export default function EditTripPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [trip, setTrip] = useState<TripDTO | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "error" | "notdraft">("loading");
  const [form, setForm] = useState({ source: "", destination: "", cargoWeight: "", plannedDistance: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<TripDTO>(`/api/trips/${id}`)
      .then((t) => {
        setTrip(t);
        setForm({ source: t.source, destination: t.destination, cargoWeight: String(t.cargoWeight), plannedDistance: String(t.plannedDistance) });
        setState(t.status === TRIP_STATUS.DRAFT ? "ready" : "notdraft");
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
    const parsed = updateTripSchema.safeParse(form);
    if (!parsed.success) {
      const m: Record<string, string> = {};
      for (const i of parsed.error.issues) { const k = i.path[0]; if (typeof k === "string" && !m[k]) m[k] = i.message; }
      setErrors(m);
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/api/trips/${id}`, { method: "PUT", body: JSON.stringify(parsed.data) });
      router.push(`/trips/${id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.details)) if (v[0]) flat[k] = v[0];
        setErrors(flat);
      }
      setFormError(err instanceof ApiError ? err.message : "Could not save the trip.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="container">
        <p style={{ marginBottom: "var(--space-2)" }}>
          <Link href={`/trips/${id}`} style={{ fontSize: 14 }}>← Trip</Link>
        </p>
        <h1 style={{ fontSize: 22 }}>Edit trip</h1>
        {state === "loading" && <LoadingState label="Loading trip…" />}
        {state === "notfound" && <ErrorState title="Trip not found" />}
        {state === "error" && <ErrorState message="Could not load this trip." />}
        {state === "notdraft" && <ErrorState title="Cannot edit" message="Only draft trips can be edited." />}
        {state === "ready" && trip && (
          <form onSubmit={onSubmit} noValidate className="card" style={{ maxWidth: 560 }}>
            <p style={{ marginTop: 0, color: "var(--color-text-muted)", fontSize: 14 }}>
              Vehicle {trip.vehicle.registrationNumber} · Driver {trip.driver.name}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Field label="Source" error={errors.source}><input value={form.source} onChange={(e) => set("source", e.target.value)} style={inp(!!errors.source)} /></Field>
              <Field label="Destination" error={errors.destination}><input value={form.destination} onChange={(e) => set("destination", e.target.value)} style={inp(!!errors.destination)} /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Field label="Cargo weight (kg)" error={errors.cargoWeight}><input type="number" step="0.01" value={form.cargoWeight} onChange={(e) => set("cargoWeight", e.target.value)} style={inp(!!errors.cargoWeight)} /></Field>
              <Field label="Planned distance (km)" error={errors.plannedDistance}><input type="number" step="0.01" value={form.plannedDistance} onChange={(e) => set("plannedDistance", e.target.value)} style={inp(!!errors.plannedDistance)} /></Field>
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
