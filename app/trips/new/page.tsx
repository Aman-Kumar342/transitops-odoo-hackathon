"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/ui/states";
import { createTripSchema } from "@/lib/validation/trip";
import { apiFetch, ApiError } from "@/lib/client/api";
import type { VehicleDTO } from "@/lib/services/vehicle.service";
import type { DriverDTO } from "@/lib/services/driver.service";

export default function NewTripPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleDTO[] | null>(null);
  const [drivers, setDrivers] = useState<DriverDTO[] | null>(null);
  const [form, setForm] = useState({
    source: "",
    destination: "",
    vehicleId: "",
    driverId: "",
    cargoWeight: "",
    plannedDistance: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<VehicleDTO[]>("/api/vehicles/available"),
      apiFetch<DriverDTO[]>("/api/drivers/available"),
    ])
      .then(([v, d]) => {
        setVehicles(v);
        setDrivers(d);
      })
      .catch(() => {
        setVehicles([]);
        setDrivers([]);
      });
  }, []);

  const selectedVehicle = useMemo(
    () => vehicles?.find((v) => String(v.id) === form.vehicleId),
    [vehicles, form.vehicleId],
  );

  // Live capacity check (R5).
  const cargoNum = Number(form.cargoWeight);
  const overCapacity =
    selectedVehicle && form.cargoWeight !== "" && cargoNum > selectedVehicle.maxLoadCapacity;

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});
    const parsed = createTripSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }
    if (overCapacity) {
      setErrors((e) => ({ ...e, cargoWeight: `Exceeds capacity of ${selectedVehicle!.maxLoadCapacity} kg` }));
      return;
    }
    setSubmitting(true);
    try {
      const trip = await apiFetch<{ id: number }>("/api/trips", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      router.push(`/trips/${trip.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.details)) if (v[0]) flat[k] = v[0];
        setErrors(flat);
      }
      setFormError(err instanceof ApiError ? err.message : "Could not create the trip.");
      setSubmitting(false);
    }
  }

  const loading = vehicles === null || drivers === null;
  const noResources = !loading && (vehicles!.length === 0 || drivers!.length === 0);

  return (
    <AppShell>
      <div className="container">
        <p style={{ marginBottom: "var(--space-2)" }}>
          <Link href="/trips" style={{ fontSize: 14 }}>← Trips</Link>
        </p>
        <h1 style={{ fontSize: 22 }}>New trip</h1>

        {loading ? (
          <LoadingState label="Loading available vehicles and drivers…" />
        ) : (
          <form onSubmit={onSubmit} noValidate className="card" style={{ maxWidth: 560 }}>
            {noResources && (
              <div style={{ background: "rgba(183,121,31,0.12)", color: "var(--color-warning)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-4)", fontSize: 14 }}>
                {vehicles!.length === 0 ? "No available vehicles. " : ""}
                {drivers!.length === 0 ? "No eligible drivers. " : ""}
                Add or free up resources before dispatching.
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Field label="Source" error={errors.source}>
                <input value={form.source} onChange={(e) => set("source", e.target.value)} style={inp(!!errors.source)} />
              </Field>
              <Field label="Destination" error={errors.destination}>
                <input value={form.destination} onChange={(e) => set("destination", e.target.value)} style={inp(!!errors.destination)} />
              </Field>
            </div>

            <Field label="Vehicle (available only)" error={errors.vehicleId}>
              <select value={form.vehicleId} onChange={(e) => set("vehicleId", e.target.value)} style={inp(!!errors.vehicleId)}>
                <option value="">Select a vehicle…</option>
                {vehicles!.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} — {v.nameModel} (cap {v.maxLoadCapacity} kg)
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Driver (eligible only)" error={errors.driverId}>
              <select value={form.driverId} onChange={(e) => set("driverId", e.target.value)} style={inp(!!errors.driverId)}>
                <option value="">Select a driver…</option>
                {drivers!.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.licenseNumber}
                  </option>
                ))}
              </select>
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Field label="Cargo weight (kg)" error={errors.cargoWeight}>
                <input type="number" step="0.01" min="0" value={form.cargoWeight} onChange={(e) => set("cargoWeight", e.target.value)} style={inp(!!errors.cargoWeight || !!overCapacity)} />
                {overCapacity && !errors.cargoWeight && (
                  <span style={{ color: "var(--color-danger)", fontSize: 12, display: "block", marginTop: 4 }}>
                    Exceeds capacity of {selectedVehicle!.maxLoadCapacity} kg
                  </span>
                )}
              </Field>
              <Field label="Planned distance (km)" error={errors.plannedDistance}>
                <input type="number" step="0.01" min="0" value={form.plannedDistance} onChange={(e) => set("plannedDistance", e.target.value)} style={inp(!!errors.plannedDistance)} />
              </Field>
            </div>

            {formError && <div role="alert" style={{ color: "var(--color-danger)", fontSize: 14, marginBottom: "var(--space-3)" }}>{formError}</div>}

            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? "Creating…" : "Create trip (Draft)"}
              </button>
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
  return {
    width: "100%",
    padding: "var(--space-2) var(--space-3)",
    borderRadius: "var(--radius-sm)",
    border: `1px solid ${hasError ? "var(--color-danger)" : "var(--color-border)"}`,
    background: "var(--color-bg)",
    color: "var(--color-text)",
    font: "inherit",
  };
}
