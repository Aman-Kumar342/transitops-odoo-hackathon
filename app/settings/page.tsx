"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { changePasswordSchema } from "@/lib/validation/auth";
import { apiFetch, ApiError } from "@/lib/client/api";

/** Settings — change password. (More preferences arrive with later phases.) */
export default function SettingsPage() {
  return (
    <AppShell>
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: 22 }}>Settings</h1>
        <ChangePasswordCard />
      </div>
    </AppShell>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setFieldErrors({});

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/api/auth/password", {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      });
      setMessage({ kind: "ok", text: "Password updated successfully." });
      setCurrent("");
      setNew("");
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const flattened: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.details)) {
          if (v[0]) flattened[k] = v[0];
        }
        setFieldErrors(flattened);
      }
      setMessage({
        kind: "error",
        text: err instanceof ApiError ? err.message : "Could not update password.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: "var(--space-4)" }}>
      <h2 style={{ fontSize: 16 }}>Change password</h2>
      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Current password"
          type="password"
          value={currentPassword}
          onChange={setCurrent}
          error={fieldErrors.currentPassword}
          autoComplete="current-password"
        />
        <Field
          label="New password"
          type="password"
          value={newPassword}
          onChange={setNew}
          error={fieldErrors.newPassword}
          autoComplete="new-password"
          hint="At least 8 characters, including a letter and a number."
        />
        {message && (
          <div
            role="alert"
            style={{
              color: message.kind === "ok" ? "var(--color-success)" : "var(--color-danger)",
              fontSize: 14,
              marginBottom: "var(--space-3)",
            }}
          >
            {message.text}
          </div>
        )}
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  error,
  hint,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  autoComplete?: string;
}) {
  return (
    <label style={{ display: "block", marginBottom: "var(--space-4)" }}>
      <span style={{ display: "block", marginBottom: "var(--space-1)", fontSize: 14 }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "var(--space-2) var(--space-3)",
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${error ? "var(--color-danger)" : "var(--color-border)"}`,
          background: "var(--color-bg)",
          color: "var(--color-text)",
          font: "inherit",
        }}
      />
      {hint && !error && (
        <span style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginTop: 4 }}>
          {hint}
        </span>
      )}
      {error && (
        <span style={{ color: "var(--color-danger)", fontSize: 12, display: "block", marginTop: 4 }}>
          {error}
        </span>
      )}
    </label>
  );
}
