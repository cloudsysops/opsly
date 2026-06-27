import {
  PESKIDS_RESERVATION_FORM_ANCHOR,
  PESKIDS_RESERVATION_FORM_HREF,
} from '@/lib/peskids-landing-config';

/** Scroll to the lead form on pages that embed it; otherwise navigate to home anchor. */
export function navigateToPeskidsReservationForm(pathname: string | null): void {
  const onFormPage = pathname === '/' || pathname === '/instagram';
  if (onFormPage) {
    const target = document.getElementById(PESKIDS_RESERVATION_FORM_ANCHOR);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      return;
    }
  }
  window.location.href = PESKIDS_RESERVATION_FORM_HREF;
}
