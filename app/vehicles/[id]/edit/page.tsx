"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { VehicleForm } from "@/components/vehicle-form";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { apiFetch, ApiError } from "@/lib/client/api";
import type { VehicleDTO } from "@/lib/services/vehicle.service";

export default function EditVehiclePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [vehicle, setVehicle] = useState<VehicleDTO | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "error">("loading");

  useEffect(() => {
    apiFetch<VehicleDTO>(`/api/vehicles/${id}`)
      .then((v) => {
        setVehicle(v);
        setState("ready");
      })
      .catch((err) => {
        setState(err instanceof ApiError && err.status === 404 ? "notfound" : "error");
      });
  }, [id]);

  return (
    <AppShell>
      <div className="container">
        <p style={{ marginBottom: "var(--space-2)" }}>
          <Link href={`/vehicles/${id}`} style={{ fontSize: 14 }}>
            ← Vehicle
          </Link>
        </p>
        <h1 style={{ fontSize: 22 }}>Edit vehicle</h1>
        {state === "loading" && <LoadingState label="Loading vehicle…" />}
        {state === "notfound" && <ErrorState title="Vehicle not found" />}
        {state === "error" && <ErrorState message="Could not load this vehicle." />}
        {state === "ready" && vehicle && <VehicleForm mode="edit" vehicle={vehicle} />}
      </div>
    </AppShell>
  );
}
