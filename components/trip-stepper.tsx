import { TRIP_STATUS, type TripStatusValue } from "@/lib/domain/trip";

/**
 * Trip lifecycle stepper (mockup screen 4): Draft → Dispatched → Completed, or the
 * cancelled branch. Highlights the current stage. Presentational only.
 */
export function TripStepper({ status }: { status: TripStatusValue }) {
  const cancelled = status === TRIP_STATUS.CANCELLED;
  const stages: { key: string; label: string }[] = cancelled
    ? [
        { key: "DRAFT", label: "Draft" },
        { key: "CANCELLED", label: "Cancelled" },
      ]
    : [
        { key: "DRAFT", label: "Draft" },
        { key: "DISPATCHED", label: "Dispatched" },
        { key: "COMPLETED", label: "Completed" },
      ];

  const order = ["DRAFT", "DISPATCHED", "COMPLETED"];
  const activeIndex = cancelled ? stages.length - 1 : order.indexOf(status);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      {stages.map((s, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex;
        const isCancel = cancelled && i === stages.length - 1;
        const bg = isCancel
          ? "var(--color-danger)"
          : done || current
            ? "var(--color-primary)"
            : "var(--color-surface-2)";
        const fg = isCancel || done || current ? "#fff" : "var(--color-text-muted)";
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: bg,
                color: fg,
                outline: current ? "2px solid var(--color-primary)" : "none",
                outlineOffset: 1,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  background: "rgba(255,255,255,0.25)",
                }}
              >
                {i + 1}
              </span>
              {s.label}
            </span>
            {i < stages.length - 1 && (
              <span style={{ width: 18, height: 2, background: "var(--color-border)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
