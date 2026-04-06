"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useTenants } from "@/hooks/useTenants";
import { sendInvitation } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function InvitationsPage(): ReactElement {
  const { data, error, isLoading } = useTenants({ page: 1, limit: 100 });
  const [tenantRef, setTenantRef] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"developer" | "managed">("developer");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<string | null>(null);

  const tenantOptions = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => {
    if (tenantRef.length > 0 || tenantOptions.length === 0) {
      return;
    }
    setTenantRef(tenantOptions[0]?.slug ?? "");
  }, [tenantOptions, tenantRef]);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setFormError(null);
    setSuccessLink(null);
    if (!tenantRef || !email.trim()) {
      setFormError("Selecciona tenant e introduce el email del propietario.");
      return;
    }
    setBusy(true);
    try {
      const res = await sendInvitation({
        email: email.trim(),
        tenantRef,
        mode,
        ...(displayName.trim().length > 0 ? { name: displayName.trim() } : {}),
      });
      setSuccessLink(res.link);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (): Promise<void> => {
    if (!successLink) {
      return;
    }
    await navigator.clipboard.writeText(successLink);
  };

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-mono text-lg text-ops-green">invitations</h1>
      <p className="font-sans text-sm text-ops-gray">
        El email debe coincidir con{" "}
        <code className="text-ops-green">owner_email</code> del tenant en
        Supabase. En producción hace falta token admin (
        <code className="text-neutral-400">
          NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN
        </code>
        ) salvo modo demo con mutaciones bloqueadas.
      </p>

      {error ? (
        <div className="rounded border border-ops-red/50 bg-ops-red/10 px-3 py-2 font-sans text-sm text-ops-red">
          {error.message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm text-neutral-200">
            Enviar invitación al portal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1">
                <label
                  className="font-sans text-xs text-ops-gray"
                  htmlFor="tenant"
                >
                  tenant
                </label>
                <Select value={tenantRef} onValueChange={setTenantRef}>
                  <SelectTrigger id="tenant">
                    <SelectValue placeholder="slug" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantOptions.map((t) => (
                      <SelectItem key={t.id} value={t.slug}>
                        {t.slug} — {t.owner_email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label
                  className="font-sans text-xs text-ops-gray"
                  htmlFor="email"
                >
                  email (owner)
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder={
                    tenantOptions.find((t) => t.slug === tenantRef)
                      ?.owner_email ?? ""
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <label
                  className="font-sans text-xs text-ops-gray"
                  htmlFor="mode"
                >
                  modo portal
                </label>
                <Select
                  value={mode}
                  onValueChange={(v) => setMode(v as "developer" | "managed")}
                >
                  <SelectTrigger id="mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="developer">developer</SelectItem>
                    <SelectItem value="managed">managed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label
                  className="font-sans text-xs text-ops-gray"
                  htmlFor="name"
                >
                  nombre en email (opcional)
                </label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(ev) => setDisplayName(ev.target.value)}
                  placeholder="default: nombre del tenant"
                />
              </div>

              {formError ? (
                <div className="rounded border border-ops-red/40 bg-ops-red/10 px-3 py-2 text-sm text-ops-red">
                  {formError}
                </div>
              ) : null}

              {successLink ? (
                <div className="space-y-2 rounded border border-ops-green/40 bg-ops-green/10 px-3 py-2">
                  <p className="font-sans text-xs text-ops-green">
                    Invitación enviada. Enlace (copiar y pegar en ventana
                    privada):
                  </p>
                  <p className="break-all font-mono text-[11px] text-neutral-300">
                    {successLink}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => void copyLink()}
                  >
                    Copiar enlace
                  </Button>
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={busy || tenantOptions.length === 0}
              >
                {busy ? "Enviando…" : "Enviar invitación"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
