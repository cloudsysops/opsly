"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  MapPinIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/outline";
import { TerritoryData, getStatusColor } from "@/lib/territories/mapbox";
import { TerritoryCard } from "@/components/territories/TerritoryCard";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface MapSidebarProps {
  territories: TerritoryData[];
  selectedTerritoryId?: string | null;
  onTerritorySelect: (id: string) => void;
  onCreateClick: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  children?: React.ReactNode;
}

const STATUS_FILTERS = ["All", "Available", "Sold", "Active", "Reserved"] as const;

export function MapSidebar({
  territories,
  selectedTerritoryId,
  onTerritorySelect,
  onCreateClick,
  isCollapsed,
  onToggleCollapse,
  children,
}: MapSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showDetail, setShowDetail] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const filteredTerritories = useMemo(() => {
    return territories.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.state.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "All" ||
        t.status === statusFilter.toUpperCase();
      return matchesSearch && matchesStatus;
    });
  }, [territories, searchQuery, statusFilter]);

  const selectedTerritory = useMemo(() => {
    if (!selectedTerritoryId) return null;
    return territories.find((t) => t.id === selectedTerritoryId) || null;
  }, [territories, selectedTerritoryId]);

  const handleTerritoryClick = (id: string) => {
    onTerritorySelect(id);
    setShowDetail(true);
  };

  const handleBackToList = () => {
    setShowDetail(false);
  };

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
  };

  const formatStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
  };

  return (
    <>
      <button
        onClick={onToggleCollapse}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 h-10 w-10 flex items-center justify-center bg-white border border-gray-200 shadow-md rounded-full transition-all duration-300"
        style={{
          transform: `translateY(-50%) translateX(${isCollapsed ? "-20px" : "-400px"})`,
        }}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronRightIcon className="h-4 w-4 text-gray-600" />
        )}
      </button>

      <div
        className="fixed right-0 bg-white border-l border-gray-200 shadow-xl z-20 flex flex-col transition-all duration-300 overflow-hidden"
        style={{ width: isCollapsed ? "0px" : "380px", top: "65px", height: "calc(100vh - 65px)" }}
      >
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-brand-navy">Territories</h2>
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {territories.length}
              </span>
            </div>
            <button
              onClick={onCreateClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-navy text-white text-sm font-medium rounded-lg hover:bg-brand-purple transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Create
            </button>
          </div>

          <div className="relative mb-3">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search territories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === filter
                    ? "bg-brand-navy text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {children ? (
          <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
        ) : showDetail && selectedTerritory ? (
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-100">
              <button
                onClick={handleBackToList}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                Back to list
              </button>
            </div>

            <div className="p-4 space-y-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedTerritory.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">
                    {selectedTerritory.state}
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${getStatusColor(selectedTerritory.status)}18`,
                      color: getStatusColor(selectedTerritory.status),
                    }}
                  >
                    {formatStatus(selectedTerritory.status)}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Map Coordinates
                </h4>
                <div className="flex items-center gap-2 text-sm">
                  <MapPinIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">
                    {selectedTerritory.centerLat != null &&
                    selectedTerritory.centerLng != null
                      ? `${selectedTerritory.centerLat.toFixed(4)}, ${selectedTerritory.centerLng.toFixed(4)}`
                      : "--"}
                  </span>
                </div>
                {selectedTerritory.radiusMiles != null && (
                  <p className="text-xs text-gray-500">
                    Radius: {selectedTerritory.radiusMiles} mi
                  </p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Demographics
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Population</p>
                    <p className="text-sm font-semibold text-gray-900">--</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Median Income</p>
                    <p className="text-sm font-semibold text-gray-900">--</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Franchisee
                </h4>
                {selectedTerritory.franchiseeAccount ? (
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-brand-navy text-white flex items-center justify-center text-xs font-semibold">
                      {selectedTerritory.franchiseeAccount.prospect.firstName.charAt(0)}
                      {selectedTerritory.franchiseeAccount.prospect.lastName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedTerritory.franchiseeAccount.prospect.firstName}{" "}
                      {selectedTerritory.franchiseeAccount.prospect.lastName}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Unassigned</p>
                )}
              </div>

              {selectedTerritory.territoryScore != null && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Territory Score
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-green"
                        style={{
                          width: `${selectedTerritory.territoryScore}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {selectedTerritory.territoryScore}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors">
                  <PencilSquareIcon className="h-4 w-4" />
                  Edit
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                  Zoom To
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {filteredTerritories.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500">No territories found</p>
              </div>
            ) : (
              filteredTerritories.map((territory) => (
                <TerritoryCard
                  key={territory.id}
                  territory={territory}
                  isSelected={territory.id === selectedTerritoryId}
                  onClick={() => handleTerritoryClick(territory.id)}
                />
              ))
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Territory"
        message={`Are you sure you want to delete "${selectedTerritory?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </>
  );
}
