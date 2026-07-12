import Link from "next/link";

/** 403 — shown when an authenticated user lacks permission for a page. (guidelines.md §12) */
export default function UnauthorizedPage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "var(--space-5)" }}>
      <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, color: "var(--color-danger)" }}>Access denied</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          You don&apos;t have permission to view this page. If you believe this is a
          mistake, contact your administrator.
        </p>
        <Link href="/" className="btn btn--primary" style={{ justifyContent: "center" }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
