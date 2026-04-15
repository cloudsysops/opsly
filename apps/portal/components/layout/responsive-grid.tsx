import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

const GRID_BY_PRESET = {
  "1-1-1": "grid-cols-1 sm:grid-cols-1 lg:grid-cols-1",
  "1-2-2": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2",
  "1-2-3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  "1-2-4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

export type ResponsiveGridPreset = keyof typeof GRID_BY_PRESET;

interface ResponsiveGridProps {
  children: ReactNode;
  /** Tailwind-safe preset; avoids dynamic class names. */
  preset?: ResponsiveGridPreset;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export function ResponsiveGrid({
  children,
  preset = "1-2-2",
  gap = "md",
  className = "",
}: ResponsiveGridProps): ReactElement {
  const gaps = {
    sm: "gap-3",
    md: "gap-4",
    lg: "gap-6",
  } as const;

  return (
    <div className={cn("grid", GRID_BY_PRESET[preset], gaps[gap], className)}>{children}</div>
  );
}

interface ResponsiveStackProps {
  children: ReactNode;
  direction?: "vertical" | "horizontal";
  spacing?: "sm" | "md" | "lg";
  className?: string;
}

export function ResponsiveStack({
  children,
  direction = "vertical",
  spacing = "md",
  className = "",
}: ResponsiveStackProps): ReactElement {
  const gap = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  } as const;

  return (
    <div
      className={cn(
        "flex",
        direction === "vertical" ? "flex-col" : "flex-row flex-wrap",
        gap[spacing],
        className,
      )}
    >
      {children}
    </div>
  );
}
