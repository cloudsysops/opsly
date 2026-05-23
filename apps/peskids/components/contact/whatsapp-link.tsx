'use client'

import Link from 'next/link'
import { WhatsAppIcon } from '@/components/contact/whatsapp-icon'
import { buildWhatsAppUrl, PESKIDS_CONTACT } from '@/lib/contact-channels'
import { peskidsColorTokens } from '@/lib/tokens'
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

  const whatsappGreen = peskidsColorTokens.primary.whatsapp
  const whatsappHover = peskidsColorTokens.status.success
  const whatsappDark = peskidsColorTokens.dark.darkBlue

  const base =
    variant === 'hero'
      ? cn(
          'inline-flex h-14 min-w-[220px] items-center justify-center gap-2.5 rounded-full px-8 text-base font-bold text-white transition active:scale-[0.99]',
          'shadow-lg hover:shadow-xl'
        )
      : variant === 'button'
        ? cn(
            'inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold text-white transition active:scale-[0.99]',
            'shadow-md'
          )
        : variant === 'onDark'
        ? 'inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold text-white ring-2 ring-white/20 transition active:scale-[0.99]'
        : variant === 'pill'
          ? cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition'
            )
          : cn('inline-flex items-center gap-2 text-sm font-semibold', 'hover:underline')

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(base, className)}
      style={{
        ...(variant === 'hero' && {
          backgroundColor: whatsappGreen,
          boxShadow: `0 10px 25px ${whatsappGreen}73, var(--tw-shadow)`,
          color: '#ffffff',
        }),
        ...(variant === 'button' && {
          backgroundColor: whatsappGreen,
          boxShadow: `0 4px 12px ${whatsappGreen}59`,
          color: '#ffffff',
        }),
        ...(variant === 'onDark' && {
          backgroundColor: whatsappGreen,
          color: '#ffffff',
        }),
        ...(variant === 'pill' && {
          borderColor: `${whatsappGreen}4d`,
          backgroundColor: `${whatsappGreen}1a`,
          color: whatsappDark,
        }),
        ...(!variant || variant === 'ghost' && {
          color: whatsappDark,
        }),
      }}
      onMouseEnter={(e) => {
        if (variant === 'hero' || variant === 'button' || variant === 'onDark') {
          e.currentTarget.style.backgroundColor = whatsappHover
        } else if (variant === 'pill') {
          e.currentTarget.style.backgroundColor = `${whatsappGreen}26`
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'hero' || variant === 'button' || variant === 'onDark') {
          e.currentTarget.style.backgroundColor = whatsappGreen
        } else if (variant === 'pill') {
          e.currentTarget.style.backgroundColor = `${whatsappGreen}1a`
        }
      }}
      aria-label={`Escribir por WhatsApp al ${PESKIDS_CONTACT.whatsapp.display}`}
    >
      {showIcon ? (
        <WhatsAppIcon className={cn('shrink-0', variant === 'hero' ? 'h-6 w-6' : 'h-5 w-5')} />
      ) : null}
      <span>{label}</span>
    </Link>
  )
}
