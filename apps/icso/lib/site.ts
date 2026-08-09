export const siteConfig = {
  name: 'IntCloud SysOps',
  shortName: 'ICSO',
  legalName: 'IntCloud SysOps',
  description:
    'AI automation agency: Opsly modules for lead capture, CRM, follow-up, and ops visibility — sold and delivered by ICSO.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://intcloudsysops.com',
  contactEmail: 'hello@intcloudsysops.com',
  tagline: 'SEE. AUTOMATE. GROW.',
  mission:
    'We sell and operate Opsly modules — capture leads, automate follow-ups with human approval, and give owners one clear view of operations.',
} as const;

export const navLinks = [
  { href: '/services', label: 'Services' },
  { href: '/quote', label: 'Get a quote' },
  { href: '/#pricing', label: 'Packages' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

export const poweredByStack = [
  'Opsly',
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
    description: 'Configure CRM, forms, automations, and integrations.',
  },
  {
    step: '03',
    title: 'Automation',
    description: 'Launch workflows, AI assists, and monitoring.',
  },
  {
    step: '04',
    title: 'Optimization',
    description: 'Iterate on conversion, speed, and visibility with data.',
  },
] as const;

/** @deprecated Prefer commercialCatalog packages via PricingCards */
export const pricingTiers = [] as const;

export const techStackItems = [
  { name: 'Opsly', role: 'Multi-tenant control plane + modules' },
  { name: 'Twenty CRM', role: 'Pipeline & opportunities per tenant' },
  { name: 'n8n', role: 'Workflow orchestration' },
  { name: 'Supabase', role: 'Tenant data + auth' },
  { name: 'AI Agents', role: 'Drafts with human approval' },
] as const;
