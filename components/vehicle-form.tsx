"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VEHICLE_TYPES } from "@/lib/domain/vehicle";
import { createVehicleSchema, updateVehicleSchema } from "@/lib/validation/vehicle";
import { apiFetch, ApiError } from "@/lib/client/api";
import type { VehicleDTO } from "@/lib/services/vehicle.service";

type Mode = "create" | "edit";

interface Props {
  mode: Mode;
  vehicle?: VehicleDTO;
}

interface FormState {
  registrationNumber: string;
  nameModel: string;
  type: string;
  maxLoadCapacity: string;
  odometer: string;
  acquisitionCost: string;
  region: string;
}

export function VehicleForm({ mode, vehicle }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    registrationNumber: vehicle?.registrationNumber ?? "",
    nameModel: vehicle?.nameModel ?? "",
    type: vehicle?.type ?? "",
    maxLoadCapacity: vehicle ? String(vehicle.maxLoadCapacity) : "",
    odometer: vehicle ? String(vehicle.odometer) : "0",
    acquisitionCost: vehicle ? String(vehicle.acquisitionCost) : "",
    region: vehicle?.region ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /** Async uniqueness check (R1) on blur — UX only; server is authoritative. */
  async function checkRegistration() {
    const value = form.registrationNumber.trim();
    if (!value || (mode === "edit" && value === vehicle?.registrationNumber)) return;
    try {
      const res = await apiFetch<{ items: VehicleDTO[] }>(
        `/api/vehicles?registrationNumber=${encodeURIComponent(value)}&limit=1`,
      );
      if (res.items.length > 0 && res.items[0]?.id !== vehicle?.id) {
        setErrors((e) => ({ ...e, registrationNumber: "Already registered" }));
      }
    } catch {
      /* ignore — the submit will surface any real error */
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});

    const schema = mode === "create" ? createVehicleSchema : updateVehicleSchema;
    const parsed = schema.safeParse({
      registrationNumber: form.registrationNumber,
      nameModel: form.nameModel,
      type: form.type,
      maxLoadCapacity: form.maxLoadCapacity,
      odometer: form.odometer,
      acquisitionCost: form.acquisitionCost,
      region: form.region,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const saved = await apiFetch<VehicleDTO>(
        mode === "create" ? "/api/vehicles" : `/api/vehicles/${vehicle!.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          body: JSON.stringify(parsed.data),
        },
      );
      router.push(`/vehicles/${saved.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.details)) if (v[0]) flat[k] = v[0];
        setErrors(flat);
      }
      setFormError(err instanceof ApiError ? err.message : "Could not save the vehicle.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card" style={{ maxWidth: 560 }}>
      <Field label="Registration number" error={errors.registrationNumber}>
        <input
          value={form.registrationNumber}
          onChange={(e) => set("registrationNumber", e.target.value)}
          onBlur={checkRegistration}
          placeholder="e.g. MH-12-AB-1234"
          style={inputStyle(!!errors.registrationNumber)}
        />
      </Field>

      <Field label="Name / model" error={errors.nameModel}>
        <input
          value={form.nameModel}
          onChange={(e) => set("nameModel", e.target.value)}
          placeholder="e.g. Tata Ace"
          style={inputStyle(!!errors.nameModel)}
        />
      </Field>

      <Field label="Type" error={errors.type}>
        <select
          value={form.type}
          onChange={(e) => set("type", e.target.value)}
          style={inputStyle(!!errors.type)}
        >
          <option value="">Select a type…</option>
          {VEHICLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        <Field label="Max load capacity (kg)" error={errors.maxLoadCapacity}>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.maxLoadCapacity}
            onChange={(e) => set("maxLoadCapacity", e.target.value)}
            style={inputStyle(!!errors.maxLoadCapacity)}
          />
        </Field>
        <Field label="Odometer (km)" error={errors.odometer}>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.odometer}
            onChange={(e) => set("odometer", e.target.value)}
            style={inputStyle(!!errors.odometer)}
          />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        <Field label="Acquisition cost" error={errors.acquisitionCost}>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.acquisitionCost}
            onChange={(e) => set("acquisitionCost", e.target.value)}
            style={inputStyle(!!errors.acquisitionCost)}
          />
        </Field>
        <Field label="Region (optional)" error={errors.region}>
          <input
            value={form.region}
            onChange={(e) => set("region", e.target.value)}
            style={inputStyle(!!errors.region)}
          />
        </Field>
      </div>

      {formError && (
        <div role="alert" style={{ color: "var(--color-danger)", fontSize: 14, marginBottom: "var(--space-3)" }}>
          {formError}
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create vehicle" : "Save changes"}
        </button>
        <button type="button" className="btn" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block", marginBottom: "var(--space-4)" }}>
      <span style={{ display: "block", marginBottom: "var(--space-1)", fontSize: 14 }}>{label}</span>
      {children}
      {error && (
        <span style={{ color: "var(--color-danger)", fontSize: 12, display: "block", marginTop: 4 }}>
          {error}
        </span>
      )}
    </label>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
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
