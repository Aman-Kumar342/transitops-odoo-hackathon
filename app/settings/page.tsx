"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { changePasswordSchema } from "@/lib/validation/auth";
import { apiFetch, ApiError } from "@/lib/client/api";
import { ALL_ROLES, can, type Resource } from "@/lib/auth/rbac";

/** Settings — general preferences, RBAC matrix (mockup screen 8), and change password. */
export default function SettingsPage() {
  return (
    <AppShell>
      <div className="container" style={{ maxWidth: 760 }}>
        <h1 style={{ fontSize: 22 }}>Settings</h1>
        <GeneralCard />
        <RbacMatrixCard />
        <div style={{ maxWidth: 520 }}>
          <ChangePasswordCard />
        </div>
      </div>
    </AppShell>
  );
}

const CURRENCIES = ["INR (₹)", "USD ($)", "EUR (€)", "GBP (£)"];
const UNITS = ["Kilometers", "Miles"];

/** General settings (depot / currency / distance unit), persisted locally. */
function GeneralCard() {
  const [depot, setDepot] = useState("Gandhinagar Depot GJ4");
  const [currency, setCurrency] = useState(CURRENCIES[0]!);
  const [unit, setUnit] = useState(UNITS[0]!);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("transitops.general");
      if (raw) {
        const g = JSON.parse(raw);
        if (g.depot) setDepot(g.depot);
        if (g.currency) setCurrency(g.currency);
        if (g.unit) setUnit(g.unit);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      localStorage.setItem("transitops.general", JSON.stringify({ depot, currency, unit }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <form onSubmit={save} className="card" style={{ marginTop: "var(--space-4)" }}>
      <h2 style={{ fontSize: 16, marginTop: 0 }}>General</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
        <GField label="Depot name">
          <input value={depot} onChange={(e) => setDepot(e.target.value)} style={inp} />
        </GField>
        <GField label="Currency">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inp}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </GField>
        <GField label="Distance unit">
          <select value={unit} onChange={(e) => setUnit(e.target.value)} style={inp}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </GField>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
        <button type="submit" className="btn btn--primary">Save changes</button>
        {saved && <span style={{ color: "var(--color-success)", fontSize: 14 }}>Saved.</span>}
      </div>
    </form>
  );
}

/** Read-only RBAC matrix rendered directly from the access policy (lib/auth/rbac.ts). */
function RbacMatrixCard() {
  const cols: { key: Resource; label: string }[] = [
    { key: "vehicles", label: "Fleet" },
    { key: "drivers", label: "Drivers" },
    { key: "trips", label: "Trips" },
    { key: "maintenance", label: "Maint." },
    { key: "fuel", label: "Fuel/Exp." },
    { key: "reports", label: "Analytics" },
  ];
  function cell(role: string, res: Resource): { text: string; color: string } {
    if (can(role, res, "create") || can(role, res, "delete")) return { text: "Full", color: "var(--color-success)" };
    if (can(role, res, "read")) return { text: "View", color: "var(--color-text-muted)" };
    return { text: "—", color: "var(--color-text-muted)" };
  }
  return (
    <div className="card" style={{ marginTop: "var(--space-4)", padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--color-border)" }}>
        <strong style={{ fontSize: 16 }}>Role-Based Access (RBAC)</strong>
        <p style={{ color: "var(--color-text-muted)", fontSize: 13, margin: "4px 0 0" }}>
          Rendered live from the access policy. Full = create/manage, View = read-only.
        </p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={thStyle}>Role</th>
              {cols.map((c) => <th key={c.key} style={{ ...thStyle, textAlign: "center" }}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {ALL_ROLES.map((role) => (
              <tr key={role}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{role}</td>
                {cols.map((c) => {
                  const v = cell(role, c.key);
                  return <td key={c.key} style={{ ...tdStyle, textAlign: "center", color: v.color, fontWeight: v.text === "Full" ? 600 : 400 }}>{v.text}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  font: "inherit",
};
const thStyle: React.CSSProperties = { textAlign: "left", padding: "var(--space-3)", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontWeight: 600, whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "var(--space-3)", borderBottom: "1px solid var(--color-border)" };

function GField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", marginBottom: "var(--space-1)", fontSize: 14 }}>{label}</span>
      {children}
    </label>
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
