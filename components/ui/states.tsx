/**
 * Shared UI state components. Every data view must render loading, empty, and error
 * states — never a blank screen or raw error. (guidelines.md §12)
 */

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-6)",
        color: "var(--color-text-muted)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          border: "2px solid var(--color-border)",
          borderTopColor: "var(--color-primary)",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      {label}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "var(--space-8) var(--space-5)",
        color: "var(--color-text-muted)",
      }}
    >
      <h3 style={{ color: "var(--color-text)" }}>{title}</h3>
      {message && <p style={{ maxWidth: 420, margin: "0 auto var(--space-4)" }}>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      style={{
        textAlign: "center",
        padding: "var(--space-8) var(--space-5)",
      }}
    >
      <h3 style={{ color: "var(--color-danger)" }}>{title}</h3>
      {message && (
        <p style={{ color: "var(--color-text-muted)", maxWidth: 420, margin: "0 auto var(--space-4)" }}>
          {message}
        </p>
      )}
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
