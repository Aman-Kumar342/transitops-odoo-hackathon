"use client";

import { useState } from "react";
import { loginSchema } from "@/lib/validation/auth";
import { apiFetch, ApiError } from "@/lib/client/api";

/**
 * Login page. Client-side validation is UX only; the server is authoritative.
 * On success, redirects to the `next` param (or home). Errors are generic (no user
 * enumeration). (guidelines.md §12, §16)
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "var(--space-5)",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 380 }}>
        <p style={{ color: "var(--color-primary)", fontWeight: 700, margin: 0 }}>
          TransitOps
        </p>
        <h1 style={{ fontSize: 22 }}>Sign in</h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: 0 }}>
          Access the transport operations platform.
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
