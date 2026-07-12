/**
 * Status pill used across modules (vehicles now; drivers/trips later). Color-codes the
 * common status vocabulary so status is scannable at a glance. (guidelines.md §12)
 */

const COLORS: Record<string, { bg: string; fg: string }> = {
  // Vehicle
  AVAILABLE: { bg: "rgba(26,143,92,0.14)", fg: "var(--status-available)" },
  ON_TRIP: { bg: "rgba(43,108,176,0.14)", fg: "var(--status-ontrip)" },
  IN_SHOP: { bg: "rgba(183,121,31,0.16)", fg: "var(--status-inshop)" },
  RETIRED: { bg: "rgba(91,100,114,0.16)", fg: "var(--status-retired)" },
};

const FALLBACK = { bg: "var(--color-surface-2)", fg: "var(--color-text-muted)" };

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const c = COLORS[status] ?? FALLBACK;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: c.bg,
        color: c.fg,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
