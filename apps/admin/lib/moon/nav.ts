/**
 * Opsly Moon — navigation model (control plane).
 * Legacy admin routes remain valid; /moon/* are gradual aliases.
 */

export type MoonNavItem = {
  href: string;
  label: string;
  /** Legacy path kept for bookmarks when alias not yet primary */
  legacyHref?: string;
};

export type MoonNavSection = {
  title: string;
  items: MoonNavItem[];
};

export const MOON_NAV_SECTIONS: MoonNavSection[] = [
  {
    title: 'Plataforma',
    items: [
      { href: '/moon', label: 'Inicio', legacyHref: '/dashboard' },
      { href: '/moon/clients', label: 'Clientes', legacyHref: '/tenants' },
      { href: '/moon/ventures', label: 'Ventures' },
      { href: '/moon/blueprints', label: 'Blueprints' },
      { href: '/moon/modules', label: 'Módulos' },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      { href: '/moon/agents', label: 'Agentes', legacyHref: '/agents' },
      { href: '/moon/tasks', label: 'Tasks' },
      { href: '/moon/queue', label: 'Queue' },
      { href: '/moon/creator', label: 'Creator Studio' },
      { href: '/moon/approvals', label: 'Approvals', legacyHref: '/approval-decisions' },
      { href: '/moon/automations', label: 'Automatizaciones' },
      { href: '/moon/integrations', label: 'Integraciones' },
      { href: '/moon/deployments', label: 'Deployments' },
      { href: '/moon/health', label: 'Health', legacyHref: '/machines' },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { href: '/moon/usage', label: 'Usage', legacyHref: '/metrics/llm' },
      { href: '/moon/costs', label: 'Costos', legacyHref: '/costs' },
      { href: '/moon/billing', label: 'Billing' },
      { href: '/api-surface', label: 'Reportes API' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { href: '/moon/support', label: 'Soporte', legacyHref: '/feedback' },
      { href: '/invitations', label: 'Invitaciones' },
      { href: '/mission-control', label: 'Runtime MC' },
      { href: '/moon/settings', label: 'Settings', legacyHref: '/settings' },
    ],
  },
];

export function isMoonNavActive(pathname: string, href: string): boolean {
  if (href === '/moon') {
    return pathname === '/moon' || pathname === '/dashboard' || pathname === '/';
  }
  if (pathname === href || pathname.startsWith(`${href}/`)) {
    return true;
  }
  const section = MOON_NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.href === href);
  if (section?.legacyHref) {
    return pathname === section.legacyHref || pathname.startsWith(`${section.legacyHref}/`);
  }
  return false;
}
