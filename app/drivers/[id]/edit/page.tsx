"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DriverForm } from "@/components/driver-form";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { apiFetch, ApiError } from "@/lib/client/api";
import type { DriverDTO } from "@/lib/services/driver.service";

export default function EditDriverPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [driver, setDriver] = useState<DriverDTO | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "error">("loading");

  useEffect(() => {
    apiFetch<DriverDTO>(`/api/drivers/${id}`)
      .then((d) => {
        setDriver(d);
        setState("ready");
      })
      .catch((err) => setState(err instanceof ApiError && err.status === 404 ? "notfound" : "error"));
  }, [id]);

  return (
    <AppShell>
      <div className="container">
        <p style={{ marginBottom: "var(--space-2)" }}>
          <Link href={`/drivers/${id}`} style={{ fontSize: 14 }}>← Driver</Link>
        </p>
        <h1 style={{ fontSize: 22 }}>Edit driver</h1>
        {state === "loading" && <LoadingState label="Loading driver…" />}
        {state === "notfound" && <ErrorState title="Driver not found" />}
        {state === "error" && <ErrorState message="Could not load this driver." />}
        {state === "ready" && driver && <DriverForm mode="edit" driver={driver} />}
      </div>
    </AppShell>
  );
}
