"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { apiFetch } from "@/lib/client/api";
import type { AnalyticsReport } from "@/lib/services/analytics.service";

const fmt = (n: number) => n.toLocaleString();
const na = (n: number | null, suffix = "") => (n == null ? "N/A" : `${fmt(n)}${suffix}`);
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(m) - 1]} ${y?.slice(2)}`;
};

export default function AnalyticsPage() {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setReport(await apiFetch<AnalyticsReport>("/api/analytics"));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const maxRevenue = report ? Math.max(1, ...report.monthlyRevenue.map((m) => m.revenue)) : 1;

  return (
    <AppShell>
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Analytics</h1>
          <a href="/api/analytics/export?format=csv" className="btn btn--primary">Export CSV</a>
        </div>

        {loading ? (
          <LoadingState label="Loading analytics…" />
        ) : error || !report ? (
          <ErrorState message="Could not load analytics." onRetry={load} />
        ) : (
          <>
            {/* KPI cards */}
            <div className="stat-grid">
              <Metric label="Fuel Efficiency" value={na(report.summary.fuelEfficiency, " km/l")} />
              <Metric label="Fleet Utilization" value={`${report.summary.fleetUtilization}%`} />
              <Metric label="Operational Cost" value={fmt(report.summary.operationalCost)} />
              <Metric label="Vehicle ROI" value={na(report.summary.roi, "%")} emphasis />
            </div>
            <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: "var(--space-2)" }}>
              ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost. Revenue is captured
              per trip on completion (§18-F).
            </p>

            <div className="split-2" style={{ marginTop: "var(--space-5)" }}>
              {/* Monthly revenue chart */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 14 }}>Monthly Revenue (last 6 months)</strong>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>peak {fmt(maxRevenue)}</span>
                </div>
                {/* chart area with horizontal gridlines */}
                <div style={{ position: "relative", height: 168, marginTop: "var(--space-4)" }}>
                  {[1, 0.75, 0.5, 0.25].map((f) => (
                    <div
                      key={f}
                      style={{ position: "absolute", left: 0, right: 0, bottom: `${f * 140 + 22}px`, borderTop: "1px dashed var(--color-border)" }}
                    />
                  ))}
                  <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: "var(--space-3)", height: "100%" }}>
                    {report.monthlyRevenue.map((m) => (
                      <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{m.revenue > 0 ? fmt(m.revenue) : ""}</div>
                        <div
                          title={`${m.month}: ${fmt(m.revenue)}`}
                          style={{
                            width: "62%",
                            height: `${Math.max(2, (m.revenue / maxRevenue) * 140)}px`,
                            background: "var(--color-primary)",
                            borderRadius: "4px 4px 0 0",
                            transition: "height 0.2s ease",
                          }}
                        />
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{monthLabel(m.month)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: "var(--space-3)" }}>
                  Total revenue: {fmt(report.summary.totalRevenue)}
                </p>
              </div>

              {/* Top costliest vehicles */}
              <div className="card">
                <strong style={{ fontSize: 14 }}>Top Costliest Vehicles</strong>
                <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {report.vehicles.slice(0, 5).map((v) => (
                    <div key={v.vehicleId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Link href={`/vehicles/${v.vehicleId}`} style={{ fontWeight: 600 }}>{v.registrationNumber}</Link>
                      <span style={{ color: "var(--color-text-muted)" }}>{fmt(v.operationalCost)}</span>
                    </div>
                  ))}
                  {report.vehicles.length === 0 && <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>No data yet.</span>}
                </div>
              </div>
            </div>

            {/* Per-vehicle table */}
            <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: "var(--space-5)" }}>
              <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--color-border)" }}>
                <strong style={{ fontSize: 14 }}>Per-vehicle breakdown</strong>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead><tr><Th>Vehicle</Th><Th>Op. Cost</Th><Th>Revenue</Th><Th>Fuel Eff.</Th><Th>ROI</Th></tr></thead>
                  <tbody>
                    {report.vehicles.map((v) => (
                      <tr key={v.vehicleId}>
                        <Td><Link href={`/vehicles/${v.vehicleId}`}>{v.registrationNumber}</Link></Td>
                        <Td>{fmt(v.operationalCost)}</Td>
                        <Td>{fmt(v.revenue)}</Td>
                        <Td>{na(v.fuelEfficiency, " km/l")}</Td>
                        <Td>{na(v.roi, "%")}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Metric({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="card" style={{ padding: "var(--space-4)" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: emphasis ? "var(--color-primary)" : "var(--color-text)" }}>{value}</div>
    </div>
  );
}
function Th({ children }: { children?: React.ReactNode }) { return <th style={{ textAlign: "left", padding: "var(--space-3)", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{children}</th>; }
function Td({ children }: { children?: React.ReactNode }) { return <td style={{ padding: "var(--space-3)", borderBottom: "1px solid var(--color-border)" }}>{children}</td>; }
