"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { can, type Resource } from "@/lib/auth/rbac";
import { ThemeToggle } from "@/components/theme-toggle";

interface Me {
  id: number;
  name: string;
  email: string;
  role: { id: number; name: string };
}

// Nav labels follow the design mockup. `resource` gates the link by RBAC read
// permission (undefined = always visible). Routes keep their canonical paths.
const NAV: { href: string; label: string; resource?: Resource }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/vehicles", label: "Fleet", resource: "vehicles" },
  { href: "/drivers", label: "Drivers", resource: "drivers" },
  { href: "/trips", label: "Trips", resource: "trips" },
  { href: "/maintenance", label: "Maintenance", resource: "maintenance" },
  { href: "/fuel-expenses", label: "Fuel & Expenses", resource: "fuel" },
  { href: "/analytics", label: "Analytics", resource: "reports" },
  { href: "/settings", label: "Settings" },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * Authenticated app shell: left sidebar nav + top bar (search + user chip), matching the
 * design mockup. Auth is enforced by middleware; this shell reflects the session and
 * hides links the current role cannot read. Responsive: the sidebar collapses behind a
 * hamburger on narrow screens. (guidelines.md §12)
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    apiFetch<Me>("/api/auth/me").then(setMe).catch(() => {});
  }, []);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (q) router.push(`/vehicles?search=${encodeURIComponent(q)}`);
  }

  const items = NAV.filter(
    (item) => !item.resource || !me || can(me.role.name, item.resource, "read"),
  );

  return (
    <div className="shell">
      {navOpen && <div className="sidebar__backdrop--open" onClick={() => setNavOpen(false)} />}

      <aside className={`sidebar${navOpen ? " sidebar--open" : ""}`}>
        <div className="sidebar__brand">TransitOps</div>
        <nav className="sidebar__nav">
          {items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar__link${active ? " sidebar__link--active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar__foot">RBAC ENABLED</div>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <button className="hamburger" aria-label="Toggle menu" onClick={() => setNavOpen((o) => !o)}>
            ☰
          </button>
          <form onSubmit={onSearch} style={{ flex: 1, display: "flex" }}>
            <input
              className="topbar__search"
              placeholder="Search fleet by reg. no or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search"
            />
          </form>
          <ThemeToggle />
          {me && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <span style={{ textAlign: "right", lineHeight: 1.2 }}>
                <strong style={{ display: "block", fontSize: 13 }}>{me.name}</strong>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{me.role.name}</span>
              </span>
              <span className="avatar" title={me.name}>{initials(me.name)}</span>
              <button type="button" className="btn" onClick={logout}>Log out</button>
            </div>
          )}
        </header>

        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
