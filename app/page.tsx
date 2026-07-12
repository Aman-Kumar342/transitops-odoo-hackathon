import { AppShell } from "@/components/app-shell";

const MODULES = [
  { phase: 1, name: "Auth & RBAC", status: "in progress" },
  { phase: 2, name: "Vehicle Registry", status: "planned" },
  { phase: 3, name: "Driver Management", status: "planned" },
  { phase: 4, name: "Trip Management", status: "planned" },
  { phase: 5, name: "Maintenance", status: "planned" },
  { phase: 6, name: "Fuel & Expenses", status: "planned" },
  { phase: 7, name: "Dashboard KPIs", status: "planned" },
  { phase: 8, name: "Reports & Analytics", status: "planned" },
];

/**
 * Home / Dashboard. Protected by middleware (authenticated users only). The KPI
 * dashboard proper arrives in Phase 7; until then this shows the module roadmap.
 */
export default function HomePage() {
  return (
    <AppShell>
      <div className="container">
        <header style={{ marginBottom: "var(--space-5)" }}>
          <h1 style={{ fontSize: 22 }}>Dashboard</h1>
          <p style={{ color: "var(--color-text-muted)", maxWidth: 640 }}>
            Operational overview. KPI tiles and filters arrive in Phase 7; the modules
            below are being built out phase by phase.
          </p>
        </header>

        <section style={{ maxWidth: 720 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "var(--space-3)",
            }}
          >
            {MODULES.map((m) => (
              <div key={m.phase} className="card" style={{ padding: "var(--space-4)" }}>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  Phase {m.phase}
                </div>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {m.status}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
