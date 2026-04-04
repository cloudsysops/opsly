"use client";

import { useState } from "react";
import { PLAN_MRR_USD, PLAN_PORT_BASE } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function maskUrl(url: string | undefined): string {
  if (!url) {
    return "—";
  }
  if (url.length <= 24) {
    return "••••••••";
  }
  return `${url.slice(0, 12)}…${url.slice(-6)}`;
}

export default function SettingsPage() {
  const domain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "—";
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  const discord = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL ?? "";
  const stripeOk = process.env.NEXT_PUBLIC_STRIPE_WEBHOOK_CONFIGURED === "true";
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [backupErr, setBackupErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runBackup() {
    setBackupMsg(null);
    setBackupErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const text = await res.text();
      const body = text ? (JSON.parse(text) as { error?: string }) : {};
      if (!res.ok) {
        setBackupErr(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setBackupMsg("Backup solicitado correctamente.");
    } catch (e) {
      setBackupErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="font-mono text-lg text-ops-green">settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Platform config</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 font-sans text-sm">
          <div>
            <span className="text-ops-gray">PLATFORM_DOMAIN </span>
            <span className="font-mono text-neutral-200">{domain}</span>
          </div>
          <div>
            <span className="text-ops-gray">versión </span>
            <span className="font-mono text-neutral-200">{version}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>plan</TableHead>
                <TableHead>precio USD/mo</TableHead>
                <TableHead>portBase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(["startup", "business", "enterprise"] as const).map((p) => (
                <TableRow key={p}>
                  <TableCell className="font-mono">{p}</TableCell>
                  <TableCell className="font-mono">
                    {PLAN_MRR_USD[p]}
                  </TableCell>
                  <TableCell className="font-mono">
                    {PLAN_PORT_BASE[p]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 font-sans text-sm">
          <div>
            <span className="text-ops-gray">Discord (masked) </span>
            <span className="font-mono text-neutral-200">
              {maskUrl(discord)}
            </span>
          </div>
          <div>
            <span className="text-ops-gray">Stripe webhook </span>
            <span className="font-mono text-neutral-200">
              {stripeOk ? "configured (flag)" : "verificar en API / dashboard Stripe"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-ops-red/40">
        <CardHeader>
          <CardTitle className="text-ops-red">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-sans text-sm text-ops-gray">
            Ejecuta backup remoto vía API si el endpoint existe.
          </p>
          <Separator />
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={() => void runBackup()}
          >
            Run backup now
          </Button>
          {backupMsg ? (
            <p className="font-sans text-sm text-ops-green">{backupMsg}</p>
          ) : null}
          {backupErr ? (
            <p className="font-sans text-sm text-ops-red">{backupErr}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
