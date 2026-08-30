"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import nextDynamic from "next/dynamic";
import { MapSidebar } from "@/components/territories/MapSidebar";
import DrawingToolbar from "@/components/territories/DrawingToolbar";
import SearchBar from "@/components/territories/SearchBar";
import ContextMenu from "@/components/territories/ContextMenu";
import TerritoryCreationWizard from "@/components/territories/TerritoryCreationWizard";
import type { NewTerritoryData } from "@/components/territories/TerritoryCreationWizard";
import type { TerritoryData } from "@/lib/territories/mapbox";
import type { MapCanvasHandle } from "@/components/territories/MapCanvas";

export const dynamic = "force-dynamic";

// Dynamically import MapCanvas to avoid SSR issues with mapbox-gl
const MapCanvas = nextDynamic(
  () => import("@/components/territories/MapCanvas").then((mod) => mod.default),
  { ssr: false, loading: () => <MapLoadingPlaceholder /> }
);

function MapLoadingPlaceholder() {
  return (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-navy mx-auto mb-3"></div>
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    </div>
  );
}

export default function TerritoryMapPage() {
  const mapRef = useRef<MapCanvasHandle | null>(null);
  const [territories, setTerritories] = useState<TerritoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [drawingMode, setDrawingMode] = useState<"radius" | "polygon" | "rectangle" | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState<GeoJSON.Feature | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    lngLat: { lng: number; lat: number };
  } | null>(null);

  // Fetch territories
  useEffect(() => {
    fetchTerritories();
  }, []);

  const fetchTerritories = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/territories?limit=500");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTerritories(data.territories || []);
    } catch (err) {
      console.error("Failed to fetch territories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerritoryClick = useCallback((id: string) => {
    setSelectedTerritoryId(id);
    setContextMenu(null);
  }, []);

  const handleTerritorySelect = useCallback((id: string) => {
    setSelectedTerritoryId(id);
    // Fly to territory
    const territory = territories.find((t) => t.id === id);
    if (territory?.centerLat && territory?.centerLng) {
      mapRef.current?.flyTo(
        [territory.centerLng, territory.centerLat],
        territory.radiusMiles ? Math.max(8, 14 - Math.log2(territory.radiusMiles)) : 10
      );
    }
  }, [territories]);

  const handleMapClick = useCallback(() => {
    if (!drawingMode) {
      setContextMenu(null);
    }
  }, [drawingMode]);

  const handleMapRightClick = useCallback(
    (lngLat: { lng: number; lat: number }, point: { x: number; y: number }) => {
      if (drawingMode) return;
      setContextMenu({ position: point, lngLat });
    },
    [drawingMode]
  );

  const handleDrawComplete = useCallback((geometry: GeoJSON.Feature) => {
    setDrawnGeometry(geometry);
    setDrawingMode(null);
    setIsDrawing(false);
    setShowWizard(true);
    setSidebarCollapsed(false);
  }, []);

  const handleCreateClick = useCallback(() => {
    setShowWizard(true);
    setSelectedTerritoryId(null);
    setDrawnGeometry(null);
    setSidebarCollapsed(false);
  }, []);

  const handleStartDrawing = useCallback((mode: "radius" | "polygon" | "rectangle") => {
    setDrawingMode(mode);
    setIsDrawing(false);
    setDrawnGeometry(null);
  }, []);

  const handleDrawingModeChange = useCallback((mode: "radius" | "polygon" | "rectangle" | null) => {
    setDrawingMode(mode);
    setIsDrawing(false);
    if (!mode) {
      setDrawnGeometry(null);
    }
  }, []);

  const handleCancelDrawing = useCallback(() => {
    setDrawingMode(null);
    setIsDrawing(false);
  }, []);

  const handleWizardComplete = useCallback(async (newTerritory: NewTerritoryData) => {
    try {
      const res = await fetch("/api/admin/territories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTerritory),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create territory");
      }
      setShowWizard(false);
      setDrawnGeometry(null);
      setDrawingMode(null);
      await fetchTerritories();
    } catch (err) {
      console.error("Failed to create territory:", err);
      throw err;
    }
  }, []);

  const handleWizardCancel = useCallback(() => {
    setShowWizard(false);
    setDrawnGeometry(null);
    setDrawingMode(null);
  }, []);

  const handleContextCreateTerritory = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      setContextMenu(null);
      mapRef.current?.flyTo([lngLat.lng, lngLat.lat], 10);
      setShowWizard(true);
      setSidebarCollapsed(false);
    },
    []
  );

  const handleCopyCoordinates = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      navigator.clipboard.writeText(`${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`);
      setContextMenu(null);
    },
    []
  );

  const handleMapReady = useCallback((handle: MapCanvasHandle) => {
    mapRef.current = handle;
  }, []);

  const handleSearchSelect = useCallback(
    (result: { center: [number, number]; placeName: string; bbox?: [number, number, number, number] }) => {
      if (result.bbox) {
        mapRef.current?.fitBounds(
          [[result.bbox[0], result.bbox[1]], [result.bbox[2], result.bbox[3]]],
          50
        );
      } else {
        mapRef.current?.flyTo(result.center, 12);
      }
    },
    []
  );

  return (
    <div className="relative w-full h-full flex">
      {/* Map Canvas */}
      <div className="flex-1 relative">
        <MapCanvas
          ref={mapRef}
          territories={territories}
          selectedTerritoryId={selectedTerritoryId}
          onTerritoryClick={handleTerritoryClick}
          onMapClick={handleMapClick}
          onMapRightClick={handleMapRightClick}
          drawingMode={drawingMode}
          onDrawComplete={handleDrawComplete}
          onMapReady={handleMapReady}
        />

        {/* Search Bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
          <SearchBar onResultSelect={handleSearchSelect} />
        </div>

        {/* Drawing Toolbar */}
        <DrawingToolbar
          activeMode={drawingMode}
          onModeChange={handleDrawingModeChange}
          onCancel={handleCancelDrawing}
          isDrawing={isDrawing}
        />

        {/* Context Menu */}
        <ContextMenu
          position={contextMenu?.position || null}
          lngLat={contextMenu?.lngLat || null}
          onClose={() => setContextMenu(null)}
          onCreateTerritory={handleContextCreateTerritory}
          onCopyCoordinates={handleCopyCoordinates}
        />
      </div>

      {/* Sidebar */}
      <MapSidebar
        territories={territories}
        selectedTerritoryId={selectedTerritoryId}
        onTerritorySelect={handleTerritorySelect}
        onCreateClick={handleCreateClick}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        {showWizard && (
          <TerritoryCreationWizard
            onComplete={handleWizardComplete}
            onCancel={handleWizardCancel}
            drawnGeometry={drawnGeometry}
            onStartDrawing={handleStartDrawing}
          />
        )}
      </MapSidebar>
    </div>
  );
}
