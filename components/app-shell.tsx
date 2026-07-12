"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { can, type Resource } from "@/lib/auth/rbac";

interface Me {
  id: number;
  name: string;
  email: string;
  role: { id: number; name: string };
}

// Nav grows as modules land in later phases. `resource` gates the link by RBAC read
// permission (undefined = always visible).
const NAV: { href: string; label: string; resource?: Resource }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/vehicles", label: "Vehicles", resource: "vehicles" },
  { href: "/drivers", label: "Drivers", resource: "drivers" },
  { href: "/trips", label: "Trips", resource: "trips" },
  { href: "/maintenance", label: "Maintenance", resource: "maintenance" },
  { href: "/settings", label: "Settings" },
];

/**
 * Authenticated app shell: top nav, current user, and logout. Rendered around every
 * protected page. Auth itself is enforced by middleware; this shell assumes a valid
 * session and reflects it. (guidelines.md §12)
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    apiFetch<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => {
        /* apiFetch redirects on 401; other errors leave me null */
      });
  }, []);

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-5)",
            paddingTop: "var(--space-3)",
            paddingBottom: "var(--space-3)",
          }}
        >
          <Link
            href="/"
            style={{ fontWeight: 700, color: "var(--color-primary)", textDecoration: "none" }}
          >
            TransitOps
          </Link>
          <nav style={{ display: "flex", gap: "var(--space-3)", flex: 1 }}>
            {NAV.filter(
              (item) => !item.resource || !me || can(me.role.name, item.resource, "read"),
            ).map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: "var(--space-1) var(--space-2)",
                    borderRadius: "var(--radius-sm)",
                    color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                    fontWeight: active ? 600 : 400,
                    textDecoration: "none",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {me && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <span style={{ textAlign: "right", lineHeight: 1.2 }}>
                <strong style={{ display: "block", fontSize: 13 }}>{me.name}</strong>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {me.role.name}
                </span>
              </span>
              <button type="button" className="btn" onClick={logout}>
                Log out
              </button>
            </div>
          )}
        </div>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
