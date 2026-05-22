'use client'

import { usePathname } from 'next/navigation'
import { WhatsAppIcon } from '@/components/contact/whatsapp-icon'
import { buildWhatsAppUrl, PESKIDS_CONTACT } from '@/lib/contact-channels'
import { cn } from '@/lib/utils'

/** FAB fijo; oculto en rutas /admin. */
export function WhatsAppFloatingButton(): React.ReactElement | null {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) {
    return null
  }

  const href = buildWhatsAppUrl()

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full',
        'bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40',
        'transition-transform duration-200 hover:scale-105 active:scale-95',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]'
      )}
      aria-label={`Chatear por WhatsApp: ${PESKIDS_CONTACT.whatsapp.display}`}
      title="WhatsApp Peskids"
    >
      <WhatsAppIcon className="h-7 w-7" />
      <span className="sr-only">WhatsApp</span>
    </a>
  )
}
