"use client";

/**
 * App-router global error boundary. Must render its own <html>/<body> because it
 * replaces the root layout when a render error occurs. Providing this keeps Next on the
 * app-router error path (avoids the legacy pages-router _error/_document).
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 20, color: "#c0392b" }}>Something went wrong</h1>
            <p style={{ color: "#5b6472" }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: "#4a2b6b",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
