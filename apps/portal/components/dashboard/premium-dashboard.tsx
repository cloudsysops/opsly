/**
 * Composición de dashboard tenant (sin datos de demostración).
 * Reexporta primitivas para páginas developer / managed / selector.
 */
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

export { PageLead } from "./page-lead";
export { ResponsiveGrid, ResponsiveStack } from "@/components/layouts/responsive-grid";

export function DashboardShell(props: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  const { children, className } = props;
  return <div className={cn("animate-fade-in space-y-8", className)}>{children}</div>;
}
