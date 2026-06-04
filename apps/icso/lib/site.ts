export const siteConfig = {
  name: 'IntCloud SysOps',
  shortName: 'ICSO',
  legalName: 'IntCloud SysOps',
  description:
    'AI automation agency helping businesses capture leads, automate follow-ups, and gain complete visibility into operations.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://intcloudsysops.com',
  contactEmail: 'hello@intcloudsysops.com',
  tagline: 'SEE. AUTOMATE. GROW.',
  mission:
    'We help businesses capture leads, automate follow-ups, and gain visibility into their operations — powered by GoHighLevel, automation, and AI.',
} as const;

export const navLinks = [
  { href: '/services', label: 'Services' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

export const poweredByStack = [
  'GoHighLevel',
  'Opsly',
  'n8n',
  'AWS',
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

export const solutionCards = [
  {
    title: 'CRM Automation',
    description: 'Pipeline, tags, and follow-up sequences aligned to how you sell.',
  },
  {
    title: 'Lead Management',
    description: 'Capture, route, and nurture leads from every channel.',
  },
  {
    title: 'AI Agents',
    description: 'Assistants that draft, summarize, and trigger the right next step.',
  },
  {
    title: 'Workflow Automation',
    description: 'n8n and platform workflows that remove repetitive work.',
  },
  {
    title: 'Business Dashboards',
    description: 'Operational visibility your team can act on daily.',
  },
  {
    title: 'Cloud Consulting',
    description: 'Secure, scalable infrastructure for automation at scale.',
  },
] as const;

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

export const pricingTiers = [
  {
    name: 'Starter',
    price: '$997',
    period: '/mo',
    description: 'Essential automation for growing teams.',
    features: [
      'CRM setup & lead capture',
      'Core follow-up automations',
      'Monthly health review',
    ],
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '$2,497',
    period: '/mo',
    description: 'Full funnel automation with dashboards.',
    features: [
      'Everything in Starter',
      'Multi-channel workflows',
      'AI-assisted follow-up',
      'Business dashboards',
    ],
    highlighted: true,
  },
  {
    name: 'Pro',
    price: 'Custom',
    period: '',
    description: 'Enterprise programs and dedicated support.',
    features: [
      'Custom integrations',
      'Dedicated automation architect',
      'SLA & priority support',
    ],
    highlighted: false,
  },
] as const;

export const techStackItems = [
  { name: 'Opsly', role: 'Multi-tenant control plane' },
  { name: 'GoHighLevel', role: 'CRM & client-facing automations' },
  { name: 'n8n', role: 'Workflow orchestration' },
  { name: 'AWS', role: 'Cloud infrastructure' },
  { name: 'AI Agents', role: 'Intelligent operations layer' },
] as const;
