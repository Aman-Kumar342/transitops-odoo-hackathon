"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LICENSE_CATEGORIES } from "@/lib/domain/driver";
import { createDriverSchema, updateDriverSchema } from "@/lib/validation/driver";
import { apiFetch, ApiError } from "@/lib/client/api";
import type { DriverDTO } from "@/lib/services/driver.service";

type Mode = "create" | "edit";

interface FormState {
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contactNumber: string;
  safetyScore: string;
}

export function DriverForm({ mode, driver }: { mode: Mode; driver?: DriverDTO }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: driver?.name ?? "",
    licenseNumber: driver?.licenseNumber ?? "",
    licenseCategory: driver?.licenseCategory ?? "",
    licenseExpiryDate: driver?.licenseExpiryDate ?? "",
    contactNumber: driver?.contactNumber ?? "",
    safetyScore: driver ? String(driver.safetyScore) : "100",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function checkLicense() {
    const value = form.licenseNumber.trim();
    if (!value || (mode === "edit" && value === driver?.licenseNumber)) return;
    try {
      const res = await apiFetch<{ items: DriverDTO[] }>(
        `/api/drivers?licenseNumber=${encodeURIComponent(value)}&limit=1&includeDeleted=true`,
      );
      if (res.items.length > 0 && res.items[0]?.id !== driver?.id) {
        setErrors((e) => ({ ...e, licenseNumber: "Already registered" }));
      }
    } catch {
      /* ignore — submit will surface real errors */
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});

    const schema = mode === "create" ? createDriverSchema : updateDriverSchema;
    const parsed = schema.safeParse({
      name: form.name,
      licenseNumber: form.licenseNumber,
      licenseCategory: form.licenseCategory,
      licenseExpiryDate: form.licenseExpiryDate,
      contactNumber: form.contactNumber,
      safetyScore: form.safetyScore,
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
      const saved = await apiFetch<DriverDTO>(
        mode === "create" ? "/api/drivers" : `/api/drivers/${driver!.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          body: JSON.stringify(parsed.data),
        },
      );
      router.push(`/drivers/${saved.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.details)) if (v[0]) flat[k] = v[0];
        setErrors(flat);
      }
      setFormError(err instanceof ApiError ? err.message : "Could not save the driver.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card" style={{ maxWidth: 560 }}>
      <Field label="Full name" error={errors.name}>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} style={inp(!!errors.name)} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        <Field label="License number" error={errors.licenseNumber}>
          <input
            value={form.licenseNumber}
            onChange={(e) => set("licenseNumber", e.target.value)}
            onBlur={checkLicense}
            style={inp(!!errors.licenseNumber)}
          />
        </Field>
        <Field label="License category" error={errors.licenseCategory}>
          <select
            value={form.licenseCategory}
            onChange={(e) => set("licenseCategory", e.target.value)}
            style={inp(!!errors.licenseCategory)}
          >
            <option value="">Select…</option>
            {LICENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        <Field label="License expiry date" error={errors.licenseExpiryDate}>
          <input
            type="date"
            value={form.licenseExpiryDate}
            onChange={(e) => set("licenseExpiryDate", e.target.value)}
            style={inp(!!errors.licenseExpiryDate)}
          />
        </Field>
        <Field label="Contact number" error={errors.contactNumber}>
          <input
            value={form.contactNumber}
            onChange={(e) => set("contactNumber", e.target.value)}
            placeholder="+91 98765 43210"
            style={inp(!!errors.contactNumber)}
          />
        </Field>
      </div>

      <Field label="Safety score (0–100)" error={errors.safetyScore}>
        <input
          type="number"
          min="0"
          max="100"
          value={form.safetyScore}
          onChange={(e) => set("safetyScore", e.target.value)}
          style={{ ...inp(!!errors.safetyScore), maxWidth: 160 }}
        />
      </Field>

      {formError && (
        <div role="alert" style={{ color: "var(--color-danger)", fontSize: 14, marginBottom: "var(--space-3)" }}>
          {formError}
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create driver" : "Save changes"}
        </button>
        <button type="button" className="btn" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: "var(--space-4)" }}>
      <span style={{ display: "block", marginBottom: "var(--space-1)", fontSize: 14 }}>{label}</span>
      {children}
      {error && (
        <span style={{ color: "var(--color-danger)", fontSize: 12, display: "block", marginTop: 4 }}>{error}</span>
      )}
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
