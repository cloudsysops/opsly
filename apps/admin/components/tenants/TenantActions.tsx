"use client";

import { useState } from "react";
import { deleteTenant, resumeTenant, suspendTenant } from "@/lib/api-client";
import type { TenantStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function TenantActions({
  tenantId,
  slug,
  status,
  onMutate,
  onDeleted,
}: {
  tenantId: string;
  slug: string;
  status: TenantStatus;
  onMutate: () => void;
  onDeleted?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState("");

  async function handleSuspend() {
    setErr(null);
    setBusy(true);
    try {
      await suspendTenant(tenantId);
      onMutate();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleResume() {
    setErr(null);
    setBusy(true);
    try {
      await resumeTenant(tenantId);
      onMutate();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (confirmSlug !== slug) {
      setErr("El slug no coincide.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await deleteTenant(tenantId);
      setDelOpen(false);
      onMutate();
      onDeleted?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {err ? (
        <div className="w-full rounded border border-ops-red/50 bg-ops-red/10 px-2 py-1 font-sans text-xs text-ops-red">
          {err}
        </div>
      ) : null}
      {status === "active" ? (
        <Button
          variant="destructive"
          size="sm"
          disabled={busy}
          onClick={() => void handleSuspend()}
        >
          Suspend
        </Button>
      ) : null}
      {status === "suspended" ? (
        <Button
          variant="primary"
          size="sm"
          disabled={busy}
          onClick={() => void handleResume()}
        >
          Resume
        </Button>
      ) : null}
      <Button
        variant="destructive"
        size="sm"
        disabled={busy}
        onClick={() => {
          setConfirmSlug("");
          setErr(null);
          setDelOpen(true);
        }}
      >
        Delete
      </Button>

      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar tenant</DialogTitle>
            <DialogDescription>
              Escribe el slug{" "}
              <span className="font-mono text-ops-yellow">{slug}</span> para
              confirmar. Esta acción marca el tenant como eliminado en la API.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmSlug}
            onChange={(e) => setConfirmSlug(e.target.value)}
            placeholder="slug"
            className="font-mono"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDelOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busy || confirmSlug !== slug}
              onClick={() => void handleDelete()}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
