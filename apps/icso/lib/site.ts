/**
 * Brand hierarchy (same company):
 * - ICSO / IntCloud SysOps = the AI agency that sells, implements, and operates
 * - Opsly = ICSO's multi-tenant operating system (control plane + reusable modules)
 * They are not separate vendors — Opsly lives inside ICSO.
 */
export const siteConfig = {
  name: 'IntCloud SysOps',
  shortName: 'ICSO',
  legalName: 'IntCloud SysOps',
  description:
    'IntCloud SysOps (ICSO) is the AI agency that builds and runs Opsly — our operating system for lead capture, CRM, follow-up, and ops visibility.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://intcloudsysops.com',
  contactEmail: 'hello@intcloudsysops.com',
  tagline: 'SEE. AUTOMATE. GROW.',
  mission:
    'ICSO is the agency. Opsly is our OS. We design, sell, and operate the same platform for every client — modules you can reuse, verticals you can clone.',
  /** One-line relationship for heroes / about */
  brandRelationship:
    'IntCloud SysOps (ICSO) operates Opsly — the multi-tenant AI operating system behind every engagement.',
} as const;

export const navLinks = [
  { href: '/services', label: 'Services' },
  { href: '/quote', label: 'Get a quote' },
  { href: '/#pricing', label: 'Packages' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

/** Stack layers inside Opsly / ICSO — not third-party “powered by” vendors */
export const poweredByStack = [
  'Opsly OS',
  'Twenty CRM',
  'n8n',
  'Supabase',
  'AI Agents',
] as const;

export const problemCards = [
  {
    title: 'Lost Leads',
    description:
      'Inbound interest slips through cracks when follow-up is manual or delayed.',
    icon: 'user-x' as const,
  },
  {
    title: 'Manual Follow-Up',
    description:
      'Teams spend hours on repetitive outreach instead of closing deals.',
    icon: 'clock' as const,
  },
  {
    title: 'Disorganized Operations',
    description:
      'Tools and spreadsheets fragment workflows across departments.',
    icon: 'layers' as const,
  },
  {
    title: 'Lack of Visibility',
    description:
      'Leaders lack a single view of pipeline, performance, and automation health.',
    icon: 'eye-off' as const,
  },
] as const;

/** @deprecated Prefer commercialCatalog modules via SolutionGrid */
export const solutionCards = [] as const;

export const howItWorksSteps = [
  {
    step: '01',
    title: 'Discovery',
    description: 'Map goals, tools, and bottlenecks in a structured intake.',
  },
  {
    step: '02',
    title: 'Setup',
    description: 'Activate Opsly modules and wire CRM, forms, and integrations.',
  },
  {
    step: '03',
    title: 'Automation',
    description: 'Launch workflows, AI assists, and monitoring on the Opsly OS.',
  },
  {
    step: '04',
    title: 'Optimization',
    description: 'ICSO iterates with you on conversion, speed, and visibility.',
  },
] as const;

/** @deprecated Prefer commercialCatalog packages via PricingCards */
export const pricingTiers = [] as const;

export const techStackItems = [
  { name: 'Opsly', role: 'ICSO operating system — control plane + modules' },
  { name: 'Twenty CRM', role: 'Pipeline & opportunities (Opsly tenant layer)' },
  { name: 'n8n', role: 'Workflow orchestration inside Opsly' },
  { name: 'Supabase', role: 'Tenant data + auth' },
  { name: 'AI Agents', role: 'Drafts with human approval (ICSO-governed)' },
] as const;
