"use client";

import { useEffect, useState } from "react";
import { loginSchema } from "@/lib/validation/auth";
import { apiFetch, ApiError } from "@/lib/client/api";

const REMEMBER_KEY = "transitops.rememberEmail";

/**
 * Login page. Client-side validation is UX only; the server is authoritative.
 * On success, redirects to the `next` param (or home). Errors are generic (no user
 * enumeration). (guidelines.md §12, §16)
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Prefill a remembered email.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
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
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, parsed.data.email);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* ignore */
      }
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      window.location.href = next && next.startsWith("/") ? next : "/";
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      {/* Left brand panel (mockup) */}
      <aside className="login__brand">
        <div>
          <h1>TransitOps</h1>
          <p style={{ color: "#aeb6c2", marginTop: 4 }}>Smart Transport Operations Platform</p>
        </div>
        <div>
          <p style={{ fontWeight: 600, color: "#fff", marginBottom: "var(--space-2)" }}>
            One login, four roles:
          </p>
          <ul className="login__roles">
            <li><b>Fleet Manager</b> → Fleet, Maintenance</li>
            <li><b>Driver</b> → Trips, Dashboard</li>
            <li><b>Safety Officer</b> → Drivers, Compliance</li>
            <li><b>Financial Analyst</b> → Fuel &amp; Expenses, Analytics</li>
          </ul>
          <p style={{ color: "#7a828f", fontSize: 13, marginTop: "var(--space-3)" }}>
            Access is scoped by role after login.
          </p>
        </div>
        <div className="login__foot">TRANSITOPS © 2026 · RBAC ENABLED</div>
      </aside>

      {/* Right form panel */}
      <div className="login__form">
        <div className="card" style={{ width: "100%", maxWidth: 380 }}>
          <h1 style={{ fontSize: 22, marginBottom: 0 }}>Sign in to your account</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: 4 }}>
            Enter your credentials to continue.
          </p>

        <form onSubmit={onSubmit} noValidate>
          <label style={{ display: "block", marginBottom: "var(--space-4)" }}>
            <span style={{ display: "block", marginBottom: "var(--space-1)", fontSize: 14 }}>
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              style={inputStyle(Boolean(fieldErrors.email))}
            />
            {fieldErrors.email && <FieldError msg={fieldErrors.email} />}
          </label>

          <label style={{ display: "block", marginBottom: "var(--space-4)" }}>
            <span style={{ display: "block", marginBottom: "var(--space-1)", fontSize: 14 }}>
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={inputStyle(Boolean(fieldErrors.password))}
            />
            {fieldErrors.password && <FieldError msg={fieldErrors.password} />}
          </label>

          {formError && (
            <div
              role="alert"
              style={{
                background: "rgba(192,57,43,0.08)",
                color: "var(--color-danger)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "var(--space-4)",
                fontSize: 14,
              }}
            >
              {formError}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)", fontSize: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-muted)" }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setShowForgot((v) => !v)}
              style={{ background: "none", border: "none", padding: 0, color: "var(--color-primary)", cursor: "pointer", font: "inherit" }}
            >
              Forgot password?
            </button>
          </div>
          {showForgot && (
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 0, marginBottom: "var(--space-4)" }}>
              Password resets are handled by your administrator. Contact them to reset your account.
            </p>
          )}

          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <span style={{ color: "var(--color-danger)", fontSize: 12, display: "block", marginTop: 4 }}>
      {msg}
    </span>
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
