import type { ReactElement } from "react";
import { cn } from "@/lib/utils";

export type KpiColor = "blue" | "green" | "purple" | "orange" | "red";

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon?: string;
  color?: KpiColor;
}

const colorClass: Record<KpiColor, string> = {
  blue: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
  green: "from-green-500/20 to-green-600/5 border-green-500/30",
  purple: "from-purple-500/20 to-purple-600/5 border-purple-500/30",
  orange: "from-orange-500/20 to-orange-600/5 border-orange-500/30",
  red: "from-red-500/20 to-red-600/5 border-red-500/30",
};

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon = "📊",
  color = "blue",
}: KPICardProps): ReactElement {
  return (
    <div
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-xl border bg-gradient-to-br p-6 backdrop-blur-sm transition-transform hover:scale-[1.02]",
        colorClass[color],
      )}
    >
      <div className="absolute -right-4 -top-4 text-6xl opacity-10" aria-hidden>
        {icon}
      </div>

      <div className="relative z-10">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          {title}
        </p>

        <div className="mt-2 flex flex-wrap items-end gap-2">
          <span className="text-4xl font-bold tabular-nums text-[var(--text-primary)]">
            {typeof value === "number" ? value.toLocaleString("es") : value}
          </span>

          {trend !== undefined ? (
            <span
              className={cn(
                "mb-1 text-sm font-medium",
                trend >= 0 ? "text-green-400" : "text-red-400",
              )}
            >
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </span>
          ) : null}
        </div>

        {subtitle !== undefined && subtitle.length > 0 ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
