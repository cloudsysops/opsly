'use client';

import { useMemo, useState } from 'react';
import { Copy, CheckCheck, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function ReferralLinkCard({
  referralLink,
  referralCode,
  discountCents = 20000,
}: {
  referralLink: string;
  referralCode: string;
  discountCents?: number;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const shareText = useMemo(
    () =>
      `Hola, te comparto mi link de Peskids para conocer la academia y solicitar matrícula: ${referralLink}. Si te inscribes, también me ayudas a acumular descuento.`,
    [referralLink]
  );

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-3xl border border-pk-border bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pk-primary/10 text-pk-primary">
          <Gift className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-bold text-pk-ink">Tu link de recomendación</p>
          <p className="text-xs text-pk-mutedText">
            Compártelo con familiares y amigos. El descuento se suma cuando el referido se registra.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-pk-border bg-pk-snow px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pk-mutedText">
          Código
        </p>
        <p className="mt-1 font-mono text-sm font-semibold text-pk-ink">{referralCode}</p>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-pk-mutedText">
          Link
        </p>
        <p className="mt-1 break-all text-xs text-pk-sub">{referralLink}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-pk-muted px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pk-mutedText">
            Descuento por referido
          </p>
          <p className="mt-1 text-lg font-bold text-pk-primary">{formatCurrency(discountCents)}</p>
          <p className="text-xs text-pk-sub">por cada familia que se matricule con tu link</p>
        </div>
        <div className="rounded-2xl bg-pk-muted px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pk-mutedText">
            Texto para compartir
          </p>
          <p className="mt-1 line-clamp-3 text-xs text-pk-sub">{shareText}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => void copyLink()} variant="primary">
          {copied ? (
            <CheckCheck className="h-4 w-4" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          {copied ? 'Copiado' : 'Copiar link'}
        </Button>
      </div>
    </div>
  );
}
