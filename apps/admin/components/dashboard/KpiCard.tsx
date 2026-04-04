import { cn } from "@/lib/utils";

export type KpiCardProps = {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
};

export function KpiCard({
  label,
  value,
  unit,
  trend = "neutral",
  color = "ops-green",
}: KpiCardProps) {
  const borderMap: Record<string, string> = {
    "ops-green": "border-l-ops-green",
    "ops-yellow": "border-l-ops-yellow",
    "ops-red": "border-l-ops-red",
    "ops-gray": "border-l-ops-gray",
  };
  return (
    <div
      className={cn(
        "rounded border border-ops-border bg-ops-surface border-l-4 pl-4 pr-3 py-3",
        borderMap[color] ?? "border-l-ops-green",
      )}
    >
      <div className="font-sans text-xs uppercase tracking-wide text-ops-gray">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-medium text-neutral-100">
          {value}
        </span>
        {unit ? (
          <span className="font-sans text-xs text-ops-gray">{unit}</span>
        ) : null}
        {trend !== "neutral" ? (
          <span
            className={cn(
              "font-mono text-xs",
              trend === "up" ? "text-ops-green" : "text-ops-red",
            )}
          >
            {trend === "up" ? "▲" : "▼"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
