/**
 * Shared data-table primitives so every list renders with identical header/cell styling
 * (design-system consistency). Wraps the table in a horizontal-scroll container.
 */

type Header = string | { label: string; align?: "left" | "center" | "right" };

export function DataTable({
  headers,
  children,
}: {
  headers: Header[];
  children: React.ReactNode;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {headers.map((h, i) => {
              const label = typeof h === "string" ? h : h.label;
              const align = typeof h === "string" ? "left" : (h.align ?? "left");
              return (
                <th
                  key={i}
                  style={{
                    textAlign: align,
                    padding: "var(--space-3)",
                    borderBottom: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  align,
}: {
  children?: React.ReactNode;
  align?: "left" | "center" | "right";
}) {
  return (
    <td
      style={{
        padding: "var(--space-3)",
        borderBottom: "1px solid var(--color-border)",
        textAlign: align ?? "left",
      }}
    >
      {children}
    </td>
  );
}
