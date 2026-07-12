"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DriverForm } from "@/components/driver-form";

export default function NewDriverPage() {
  return (
    <AppShell>
      <div className="container">
        <p style={{ marginBottom: "var(--space-2)" }}>
          <Link href="/drivers" style={{ fontSize: 14 }}>← Drivers</Link>
        </p>
        <h1 style={{ fontSize: 22 }}>New driver</h1>
        <DriverForm mode="create" />
      </div>
    </AppShell>
  );
}
