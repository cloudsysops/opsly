import type { TenantStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<TenantStatus, string> = {
  active: "border-ops-green/50 bg-ops-green/15 text-ops-green",
  suspended: "border-ops-yellow/50 bg-ops-yellow/15 text-ops-yellow",
  provisioning: "border-ops-blue/50 bg-ops-blue/15 text-ops-blue",
  configuring: "border-ops-blue/50 bg-ops-blue/15 text-ops-blue",
  deploying: "border-ops-blue/50 bg-ops-blue/15 text-ops-blue",
  failed: "border-ops-red/50 bg-ops-red/15 text-ops-red",
  deleted: "border-ops-gray/50 bg-ops-gray/15 text-ops-gray",
};

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  const pulse = status === "provisioning";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-sans text-xs font-medium",
        styles[status],
      )}
    >
      {pulse ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ops-blue opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-ops-blue" />
        </span>
      ) : null}
      {status}
    </span>
  );
}
