import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { PeskidsLockup } from '@/components/brand/peskids-logo'
import { SiteFooter } from '@/components/layout/site-footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReferralLinkCard } from '@/components/referrals/referral-link-card'

export default async function ThanksPage({
  searchParams,
}: {
  searchParams?: Promise<{ referral_link?: string; referral_code?: string }>
}): Promise<React.ReactElement> {
  const params = await searchParams
  const referralLink = params?.referral_link?.trim() || ''
  const referralCode = params?.referral_code?.trim() || ''

  return (
    <div className="flex min-h-screen flex-col bg-pk-bg">
      <header className="border-b border-pk-border bg-pk-surface/90 px-6 py-4">
        <PeskidsLockup height={36} />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md text-center shadow-card-hover" accent="green">
          <CardHeader className="items-center border-0 pb-0 pt-8">
            <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-pk-primary">
              <CheckCircle2 className="h-9 w-9" aria-hidden />
            </span>
            <CardTitle className="text-2xl">¡Listo, recibimos tu solicitud!</CardTitle>
            <CardDescription className="text-base">
              Te contactaremos pronto para agendar la clase de prueba gratis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            {referralLink && referralCode ? (
              <ReferralLinkCard referralLink={referralLink} referralCode={referralCode} />
            ) : null}
            <div className="rounded-xl border border-pk-border bg-pk-bg px-4 py-3 text-left text-sm text-pk-sub">
              <p className="font-semibold text-pk-ink">¿Qué sigue?</p>
              <p className="mt-1">
                Revisa tu correo y WhatsApp. Nuestro equipo de Llanogrande confirma cupo y horario.
              </p>
            </div>
            <Link href="/">
              <Button variant="primary" fullWidth>
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  )
}
