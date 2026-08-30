import {
  HomeIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  ChartBarIcon,
  AcademicCapIcon,
  BookOpenIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  FolderIcon,
  ChatBubbleLeftRightIcon,
  TicketIcon,
  BuildingOffice2Icon,
  PaintBrushIcon,
} from "@heroicons/react/24/outline";

export type PortalSection = "myFranchise" | "learning" | "business" | "support";

export interface PortalNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface PortalNavGroup {
  groupName: string;
  items: PortalNavItem[];
}

export type PortalSidebarItem = PortalNavItem | PortalNavGroup;

export function isPortalNavGroup(item: PortalSidebarItem): item is PortalNavGroup {
  return "groupName" in item;
}

export interface PortalSectionConfig {
  id: PortalSection;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  sidebarItems: PortalSidebarItem[];
}

export const portalSectionConfigs: PortalSectionConfig[] = [
  {
    id: "myFranchise",
    name: "My Franchise",
    href: "/portal/my-franchise",
    icon: HomeIcon,
    sidebarItems: [],
  },
  {
    id: "learning",
    name: "Learning Center",
    href: "/portal/learning",
    icon: AcademicCapIcon,
    sidebarItems: [
      { name: "Dashboard", href: "/portal/learning", icon: AcademicCapIcon },
      {
        groupName: "Reference",
        items: [
          { name: "Franchise Wiki", href: "/portal/learning/knowledge-base", icon: BookOpenIcon },
          { name: "Operations Manual", href: "/portal/learning/manual", icon: DocumentTextIcon },
          { name: "Resource Library", href: "/portal/learning/library", icon: FolderIcon },
          { name: "Creative Assets", href: "/portal/learning/creative-assets", icon: PaintBrushIcon },
        ],
      },
    ],
  },
  {
    id: "business",
    name: "Business & Compliance",
    href: "/portal/royalties",
    icon: BuildingOffice2Icon,
    sidebarItems: [
      { name: "Royalty Statements", href: "/portal/royalties", icon: CurrencyDollarIcon },
      { name: "Payment Setup", href: "/portal/payments", icon: BanknotesIcon },
      { name: "Report Builder", href: "/portal/reports", icon: DocumentChartBarIcon },
      { name: "Benchmarks", href: "/portal/benchmarks", icon: ChartBarIcon },
      { name: "Agreement", href: "/portal/agreement", icon: DocumentTextIcon },
      { name: "Certifications", href: "/portal/compliance", icon: ShieldCheckIcon },
      { name: "Audit Reports", href: "/portal/audits", icon: ClipboardDocumentCheckIcon },
      { name: "Documents", href: "/portal/documents", icon: FolderIcon },
    ],
  },
  {
    id: "support",
    name: "Support",
    href: "/portal/messages",
    icon: ChatBubbleLeftRightIcon,
    sidebarItems: [
      { name: "Message Center", href: "/portal/messages", icon: ChatBubbleLeftRightIcon },
      { name: "Help Desk", href: "/portal/support", icon: TicketIcon },
    ],
  },
];

export function getPortalSectionFromPath(pathname: string): PortalSection {
  // My Franchise (dashboard)
  if (pathname === "/portal" || pathname === "/portal/" ||
      pathname === "/portal/my-franchise" || pathname.startsWith("/portal/my-franchise/") ||
      pathname === "/portal/dashboard" || pathname.startsWith("/portal/dashboard/")) {
    return "myFranchise";
  }

  // Learning Center
  if (pathname.startsWith("/portal/learning") ||
      pathname.startsWith("/portal/bootcamp") ||
      pathname.startsWith("/portal/journey") ||
      pathname.startsWith("/portal/resources") ||
      pathname.startsWith("/wiki")) {
    return "learning";
  }

  // Business & Compliance
  if (pathname.startsWith("/portal/royalties") ||
      pathname.startsWith("/portal/payments") ||
      pathname.startsWith("/portal/reports") ||
      pathname.startsWith("/portal/benchmarks") ||
      pathname.startsWith("/portal/agreement") ||
      pathname.startsWith("/portal/compliance") ||
      pathname.startsWith("/portal/audits") ||
      pathname.startsWith("/portal/documents")) {
    return "business";
  }

  // Support
  if (pathname.startsWith("/portal/messages") ||
      pathname.startsWith("/portal/support")) {
    return "support";
  }

  return "myFranchise";
}

export function getPortalSectionConfig(section: PortalSection): PortalSectionConfig {
  return portalSectionConfigs.find(s => s.id === section) || portalSectionConfigs[0];
}
