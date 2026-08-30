import {
  HomeIcon,
  UsersIcon,
  ViewColumnsIcon,
  FireIcon,
  ChatBubbleLeftRightIcon,
  PlayCircleIcon,
  ChartBarIcon,
  EnvelopeIcon,
  BanknotesIcon,
  TrophyIcon,
  CurrencyDollarIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  ClipboardDocumentCheckIcon,
  AcademicCapIcon,
  BookOpenIcon,
  DocumentTextIcon,
  FolderIcon,
  MegaphoneIcon,
  BeakerIcon,
  PresentationChartLineIcon,
  LinkIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  BoltIcon,
  ServerStackIcon,
  ClipboardDocumentListIcon,
  MapPinIcon,
  DocumentDuplicateIcon,
  BuildingOffice2Icon,
  TicketIcon,
  ArrowPathIcon,
  HeartIcon,
  ChartPieIcon,
  CalculatorIcon,
  PaintBrushIcon,
  GlobeAmericasIcon,
  MapIcon,
  PlusCircleIcon,
  ArrowUpTrayIcon,
  DocumentChartBarIcon,
  AdjustmentsHorizontalIcon,
  BookmarkIcon,
  BuildingStorefrontIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";

export type AdminSection = "dashboard" | "crm" | "franchisees" | "learning" | "marketing" | "territories" | "settings";

// Sections hidden from top nav (still accessible via direct URL)
export const hiddenSections: AdminSection[] = ["crm", "territories", "marketing"];

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavGroup {
  groupName: string;
  items: NavItem[];
}

export type SidebarItem = NavItem | NavGroup;

export function isNavGroup(item: SidebarItem): item is NavGroup {
  return 'groupName' in item;
}

export interface SectionConfig {
  id: AdminSection;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  sidebarItems: SidebarItem[];
}

export const sectionConfigs: SectionConfig[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    href: "/admin",
    icon: HomeIcon,
    sidebarItems: [], // Dashboard has no sidebar - it's the main landing page
  },
  {
    id: "crm",
    name: "CRM",
    href: "/admin/crm",
    icon: UsersIcon,
    sidebarItems: [
      { name: "All Prospects", href: "/admin/crm/prospects", icon: UsersIcon },
      { name: "Pipeline Board", href: "/admin/crm/pipeline", icon: ViewColumnsIcon },
      { name: "Warm Leads", href: "/admin/crm/warm-leads", icon: FireIcon },
      { name: "Analytics", href: "/admin/crm/analytics", icon: ChartBarIcon },
      { name: "Email Templates", href: "/admin/crm/email-templates", icon: EnvelopeIcon },
      { name: "Conversations", href: "/admin/crm/conversations", icon: ChatBubbleLeftRightIcon },
      { name: "Replays", href: "/admin/crm/replays", icon: PlayCircleIcon },
    ],
  },
  {
    id: "learning",
    name: "Learning Center",
    href: "/admin/learning",
    icon: AcademicCapIcon,
    sidebarItems: [
      {
        groupName: "Programs & Training",
        items: [
          { name: "Programs", href: "/admin/learning/programs", icon: AcademicCapIcon },
          { name: "Franchisee Progress", href: "/admin/learning/progress", icon: UserGroupIcon },
          { name: "Franchisor To-Dos", href: "/admin/learning/todos", icon: ClipboardDocumentCheckIcon },
          { name: "Badges", href: "/admin/learning/badges", icon: TrophyIcon },
        ],
      },
      {
        groupName: "Content & Resources",
        items: [
          { name: "Franchise Wiki", href: "/admin/learning/knowledge-base", icon: BookOpenIcon },
          { name: "Operations Manual", href: "/admin/learning/manual", icon: DocumentTextIcon },
          { name: "Resource Library", href: "/admin/learning/library", icon: FolderIcon },
          { name: "Creative Assets", href: "/admin/learning/creative-assets", icon: PaintBrushIcon },
          { name: "Acknowledgments", href: "/admin/learning/manual/acknowledgments", icon: ClipboardDocumentCheckIcon },
        ],
      },
    ],
  },
  {
    id: "franchisees",
    name: "Franchisees",
    href: "/admin/franchisees",
    icon: AcademicCapIcon,
    sidebarItems: [
      {
        groupName: "People",
        items: [
          { name: "Overview", href: "/admin/franchisees", icon: UsersIcon },
          { name: "Documents", href: "/admin/documents", icon: DocumentDuplicateIcon },
          { name: "Multi-Unit Ops", href: "/admin/franchisees/multi-unit", icon: BuildingOffice2Icon },
          { name: "Support Tickets", href: "/admin/operations/tickets", icon: TicketIcon },
        ],
      },
      {
        groupName: "Financials",
        items: [
          { name: "Overview", href: "/admin/franchisees/financials", icon: BanknotesIcon },
          { name: "Royalties", href: "/admin/franchisees/royalties", icon: CurrencyDollarIcon },
          { name: "Invoices", href: "/admin/franchisees/invoices", icon: DocumentCheckIcon },
          { name: "Leaderboard", href: "/admin/franchisees/leaderboard", icon: TrophyIcon },
          { name: "Benchmarks", href: "/admin/franchisees/benchmarks", icon: ChartPieIcon },
        ],
      },
      {
        groupName: "Compliance",
        items: [
          { name: "Certifications", href: "/admin/franchisees/compliance", icon: ShieldCheckIcon },
          { name: "Health Scores", href: "/admin/franchisees/health-scores", icon: HeartIcon },
          { name: "Audit Templates", href: "/admin/operations/audits/templates", icon: ClipboardDocumentListIcon },
          { name: "Field Audits", href: "/admin/operations/audits", icon: DocumentCheckIcon },
        ],
      },
      {
        groupName: "Agreements",
        items: [
          { name: "All Agreements", href: "/admin/franchisees/agreements", icon: DocumentTextIcon },
          { name: "Renewals", href: "/admin/franchisees/renewals", icon: ArrowPathIcon },
        ],
      },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    href: "/admin/marketing",
    icon: MegaphoneIcon,
    sidebarItems: [
      { name: "Campaigns", href: "/admin/marketing/campaigns", icon: MegaphoneIcon },
      { name: "A/B Tests", href: "/admin/marketing/ab-tests", icon: BeakerIcon },
      { name: "Attribution Reports", href: "/admin/marketing/attribution", icon: PresentationChartLineIcon },
      { name: "Lead Sources", href: "/admin/marketing/lead-sources", icon: LinkIcon },
      { name: "Industry Benchmarks", href: "/admin/analytics/industry-benchmarks", icon: ChartBarIcon },
    ],
  },
  {
    id: "territories",
    name: "Territories",
    href: "/admin/territories",
    icon: GlobeAmericasIcon,
    sidebarItems: [
      { name: "Map Canvas", href: "/admin/territories/map", icon: MapIcon },
      { name: "All Territories", href: "/admin/territories", icon: MapPinIcon },
      { name: "Create Territory", href: "/admin/territories/new", icon: PlusCircleIcon },
      {
        groupName: "Analysis",
        items: [
          { name: "Demographics", href: "/admin/territories/demographics", icon: ChartBarIcon },
          { name: "Competitors", href: "/admin/territories/competitors", icon: BuildingStorefrontIcon },
          { name: "Scoring", href: "/admin/territories/scoring", icon: CalculatorIcon },
        ],
      },
      {
        groupName: "Tools",
        items: [
          { name: "Import Data", href: "/admin/territories/import", icon: ArrowUpTrayIcon },
          { name: "Reports", href: "/admin/territories/reports", icon: DocumentChartBarIcon },
          { name: "Expansion Planner", href: "/admin/territories/expansion", icon: RocketLaunchIcon },
        ],
      },
      {
        groupName: "Settings",
        items: [
          { name: "Scoring Weights", href: "/admin/territories/settings/scoring", icon: AdjustmentsHorizontalIcon },
          { name: "Saved Maps", href: "/admin/territories/maps", icon: BookmarkIcon },
        ],
      },
    ],
  },
  {
    id: "settings",
    name: "Settings",
    href: "/admin/settings",
    icon: Cog6ToothIcon,
    sidebarItems: [
      { name: "Users & Roles", href: "/admin/settings/users", icon: UserGroupIcon },
      { name: "Email Templates", href: "/admin/crm/email-templates", icon: EnvelopeIcon },
      { name: "Email Configuration", href: "/admin/settings/email", icon: EnvelopeIcon },
      { name: "Integrations", href: "/admin/settings/integrations", icon: ServerStackIcon },
      { name: "Royalty Configuration", href: "/admin/settings/royalties", icon: CurrencyDollarIcon },
      { name: "Health Score Config", href: "/admin/settings/health-scores", icon: HeartIcon },
      { name: "Custom Reports", href: "/admin/settings/reports", icon: ChartPieIcon },
      { name: "Benchmark Data", href: "/admin/settings/benchmarks", icon: CalculatorIcon },
      { name: "Workflow Automation", href: "/admin/workflows", icon: BoltIcon },
      { name: "System Logs", href: "/admin/settings/logs", icon: ClipboardDocumentListIcon },
      { name: "Feedback & PQS", href: "/admin/settings/feedback", icon: ChatBubbleBottomCenterTextIcon },
    ],
  },
];

export const visibleSectionConfigs = sectionConfigs.filter(
  (s) => !hiddenSections.includes(s.id)
);

export function getSectionFromPath(pathname: string): AdminSection {
  // Handle exact dashboard match first
  if (pathname === "/admin" || pathname === "/admin/") {
    return "dashboard";
  }

  // Check which section the path belongs to
  if (pathname.startsWith("/admin/crm/email-templates")) {
    return "settings";
  }
  if (pathname.startsWith("/admin/crm")) {
    return "crm";
  }
  if (pathname.startsWith("/admin/franchisees")) {
    return "franchisees";
  }
  if (pathname.startsWith("/admin/operations/audits") ||
      pathname.startsWith("/admin/operations/tickets")) {
    return "franchisees";
  }
  if (pathname.startsWith("/admin/learning")) {
    return "learning";
  }
  if (pathname.startsWith("/admin/operations/manual") ||
      pathname.startsWith("/admin/operations")) {
    return "learning";
  }
  if (pathname.startsWith("/admin/resources")) {
    return "learning";
  }
  if (pathname.startsWith("/admin/bootcamp")) {
    return "learning";
  }
  if (pathname.startsWith("/admin/marketing")) {
    return "marketing";
  }

  // Handle legacy paths during migration - map old paths to new sections
  // These will be removed once migration is complete
  if (pathname.startsWith("/admin/prospects") ||
      pathname.startsWith("/admin/pipeline") ||
      pathname.startsWith("/admin/warm-leads") ||
      pathname.startsWith("/admin/analytics") ||
      pathname.startsWith("/admin/email-templates") ||
      pathname.startsWith("/admin/conversations") ||
      pathname.startsWith("/admin/replays") ||
      pathname.startsWith("/admin/prework")) {
    return "crm";
  }

  if (pathname.startsWith("/admin/territories")) {
    return "territories";
  }

  if (pathname.startsWith("/admin/documents") ||
      pathname.startsWith("/admin/financials") ||
      pathname.startsWith("/admin/royalties") ||
      pathname.startsWith("/admin/leaderboard") ||
      pathname.startsWith("/admin/compliance")) {
    return "franchisees";
  }

  // Journey is now under Learning Center
  if (pathname.startsWith("/admin/journey")) {
    return "learning";
  }

  if (pathname.startsWith("/admin/campaigns") ||
      pathname.startsWith("/admin/ab-tests") ||
      pathname.startsWith("/admin/analytics/industry-benchmarks")) {
    return "marketing";
  }

  if (pathname.startsWith("/admin/settings") ||
      pathname.startsWith("/admin/workflows")) {
    return "settings";
  }

  // Default to dashboard for unknown paths
  return "dashboard";
}

export function getSectionConfig(section: AdminSection): SectionConfig {
  return sectionConfigs.find(s => s.id === section) || sectionConfigs[0];
}
