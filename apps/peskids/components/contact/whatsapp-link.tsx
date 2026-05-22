import Link from 'next/link'
import { WhatsAppIcon } from '@/components/contact/whatsapp-icon'
import { buildWhatsAppUrl, PESKIDS_CONTACT } from '@/lib/contact-channels'
import { cn } from '@/lib/utils'

type WhatsAppLinkVariant = 'button' | 'hero' | 'pill' | 'ghost' | 'onDark'

interface WhatsAppLinkProps {
  variant?: WhatsAppLinkVariant
  className?: string
  prefill?: string
  label?: string
  showIcon?: boolean
}

export function WhatsAppLink({
  variant = 'button',
  className,
  prefill,
  label = 'WhatsApp',
  showIcon = true,
}: WhatsAppLinkProps): React.ReactElement {
  const href = buildWhatsAppUrl({ prefill })

  const base =
    variant === 'hero'
      ? 'inline-flex h-14 min-w-[220px] items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-8 text-base font-bold text-white shadow-lg shadow-[#25D366]/45 ring-4 ring-[#25D366]/25 transition hover:bg-[#1ebe57] hover:shadow-xl active:scale-[0.99]'
      : variant === 'button'
        ? 'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 text-sm font-bold text-white shadow-md shadow-[#25D366]/35 transition hover:bg-[#1ebe57] active:scale-[0.99]'
        : variant === 'onDark'
        ? 'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 text-sm font-bold text-white ring-2 ring-white/20 transition hover:bg-[#1ebe57] active:scale-[0.99]'
        : variant === 'pill'
          ? 'inline-flex items-center gap-2 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-2 text-sm font-bold text-[#128C7E] transition hover:bg-[#25D366]/15'
          : 'inline-flex items-center gap-2 text-sm font-semibold text-[#128C7E] hover:text-[#0d6b5f]'

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(base, className)}
      aria-label={`Escribir por WhatsApp al ${PESKIDS_CONTACT.whatsapp.display}`}
    >
      {showIcon ? (
        <WhatsAppIcon className={cn('shrink-0', variant === 'hero' ? 'h-6 w-6' : 'h-5 w-5')} />
      ) : null}
      <span>{label}</span>
    </Link>
  )
}
