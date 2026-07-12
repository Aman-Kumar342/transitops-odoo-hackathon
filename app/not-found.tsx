import Link from "next/link";

/** App-router 404. Providing this keeps Next on the app-router error path. */
export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "var(--space-5)" }}>
      <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 20 }}>Page not found</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/" className="btn btn--primary" style={{ justifyContent: "center" }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
