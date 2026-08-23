"use client";

import { ReactNode } from "react";

type ContainerWidth = "narrow" | "default" | "wide" | "full";

interface ResponsiveContainerProps {
  children: ReactNode;
  width?: ContainerWidth;
  className?: string;
  /**
   * Whether to include responsive horizontal padding.
   * Default: true
   */
  withPadding?: boolean;
}

/**
 * Responsive container component with smart width management.
 *
 * Width options:
 * - narrow: max-w-4xl (1024px) - Forms, reading content, focused tasks
 * - default: max-w-7xl (1280px) - Standard pages, general content
 * - wide: max-w-[1600px] - Data tables, dashboards, grids
 * - full: no max-width - Kanban boards, CMS editors, split-panel layouts
 *
 * Usage:
 * <ResponsiveContainer width="wide">
 *   <ProspectsTable />
 * </ResponsiveContainer>
 */
export default function ResponsiveContainer({
  children,
  width = "default",
  className = "",
  withPadding = true,
}: ResponsiveContainerProps) {
  const widthClasses: Record<ContainerWidth, string> = {
    narrow: "max-w-4xl",
    default: "max-w-7xl",
    wide: "max-w-[1800px]",
    full: "", // No max-width constraint
  };

  // Tighter padding that works well with sidebar layouts
  const paddingClasses = withPadding
    ? "px-4 sm:px-6 lg:px-8"
    : "";

  const containerClasses = [
    widthClasses[width],
    width !== "full" ? "mx-auto" : "",
    paddingClasses,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={containerClasses}>{children}</div>;
}

/**
 * Wrapper for full-width layouts that removes all container constraints.
 * Use for split-panel layouts, kanban boards, and editors.
 */
export function FullWidthContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ResponsiveContainer width="full" className={className}>
      {children}
    </ResponsiveContainer>
  );
}

/**
 * Wrapper for wide layouts (dashboards, data tables).
 * Max-width: 1600px with responsive padding.
 */
export function WideContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ResponsiveContainer width="wide" className={className}>
      {children}
    </ResponsiveContainer>
  );
}

/**
 * Wrapper for narrow layouts (forms, reading content).
 * Max-width: 1024px with responsive padding.
 */
export function NarrowContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ResponsiveContainer width="narrow" className={className}>
      {children}
    </ResponsiveContainer>
  );
}

/**
 * Wrapper for default layouts (standard pages, general content).
 * Max-width: 1280px with responsive padding.
 */
export function DefaultContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ResponsiveContainer width="default" className={className}>
      {children}
    </ResponsiveContainer>
  );
}
