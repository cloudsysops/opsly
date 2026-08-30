"use client";

import { TerritoryData, getStatusColor } from "@/lib/territories/mapbox";

interface TerritoryCardProps {
  territory: TerritoryData;
  isSelected: boolean;
  onClick: () => void;
}

export function TerritoryCard({
  territory,
  isSelected,
  onClick,
}: TerritoryCardProps) {
  const statusColor = getStatusColor(territory.status);
  const franchisee = territory.franchiseeAccount?.prospect;
  const initials = franchisee
    ? `${franchisee.firstName.charAt(0)}${franchisee.lastName.charAt(0)}`
    : null;

  const statusLabel =
    territory.status.charAt(0) +
    territory.status.slice(1).toLowerCase().replace(/_/g, " ");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`px-4 py-3 cursor-pointer border-b border-gray-100 transition-colors ${
        isSelected
          ? "bg-blue-50 border-l-[3px] border-l-brand-navy"
          : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span
            className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-gray-900 truncate">
              {territory.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">{territory.state}</span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${statusColor}18`,
                  color: statusColor,
                }}
              >
                {statusLabel}
              </span>
              {territory.territoryScore != null && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  Score: {territory.territoryScore}
                </span>
              )}
            </div>
          </div>
        </div>

        {initials && (
          <div className="flex-shrink-0 h-7 w-7 rounded-full bg-brand-navy text-white flex items-center justify-center text-[10px] font-semibold">
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}
