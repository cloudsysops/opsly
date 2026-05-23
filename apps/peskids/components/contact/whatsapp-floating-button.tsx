'use client'

import { usePathname } from 'next/navigation'
import { WhatsAppIcon } from '@/components/contact/whatsapp-icon'
import { buildWhatsAppUrl, PESKIDS_CONTACT } from '@/lib/contact-channels'
import { peskidsColorTokens } from '@/lib/tokens'
import { cn } from '@/lib/utils'

/** FAB fijo — canal principal; oculto en /admin. */
export function WhatsAppFloatingButton(): React.ReactElement | null {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin')) {
    return null
  }

  const href = buildWhatsAppUrl()

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'fixed bottom-5 right-4 z-[70] flex items-center gap-2.5 rounded-full',
        'px-4 py-3.5 text-white sm:bottom-6 sm:right-6 sm:px-5 sm:py-4',
        'transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'animate-[pulse-soft_2.5s_ease-in-out_infinite]'
      )}
      style={{
        backgroundColor: peskidsColorTokens.primary.whatsapp,
        boxShadow: `0 8px 32px ${peskidsColorTokens.primary.whatsapp}8c`,
        outlineColor: peskidsColorTokens.primary.whatsapp,
      }}
      aria-label={`Escribir por WhatsApp: ${PESKIDS_CONTACT.whatsapp.display}`}
      title="WhatsApp Peskids"
    >
      <WhatsAppIcon className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
      <span className="pr-0.5 text-sm font-bold leading-none sm:text-base">WhatsApp</span>
    </a>
  )
}
