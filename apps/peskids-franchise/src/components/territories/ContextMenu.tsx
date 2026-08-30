"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  MapPinIcon,
  ClipboardDocumentIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";

interface ContextMenuProps {
  position: { x: number; y: number } | null;
  lngLat: { lng: number; lat: number } | null;
  onClose: () => void;
  onCreateTerritory: (lngLat: { lng: number; lat: number }) => void;
  onCopyCoordinates: (lngLat: { lng: number; lat: number }) => void;
}

export default function ContextMenu({
  position,
  lngLat,
  onClose,
  onCreateTerritory,
  onCopyCoordinates,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!position) return;
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [position, handleKeyDown, handleClickOutside]);

  if (!position || !lngLat) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
      style={{ left: position.x, top: position.y }}
    >
      <button
        type="button"
        onClick={() => {
          onCreateTerritory(lngLat);
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        <MapPinIcon className="h-4 w-4 text-gray-500" />
        Create territory here
      </button>
      <button
        type="button"
        onClick={() => {
          onCopyCoordinates(lngLat);
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        <ClipboardDocumentIcon className="h-4 w-4 text-gray-500" />
        Copy coordinates
      </button>

      <div className="mx-2 my-1 border-t border-gray-200" />

      <div className="flex w-full cursor-not-allowed items-center gap-2 px-3 py-2 text-sm text-gray-400">
        <ChartBarIcon className="h-4 w-4" />
        <span>Get demographics</span>
        <span className="ml-auto text-[10px]">Coming Soon</span>
      </div>
      <div className="flex w-full cursor-not-allowed items-center gap-2 px-3 py-2 text-sm text-gray-400">
        <BuildingStorefrontIcon className="h-4 w-4" />
        <span>Search competitors nearby</span>
        <span className="ml-auto text-[10px]">Coming Soon</span>
      </div>

      <div className="mx-2 mt-1 border-t border-gray-200" />
      <div className="px-3 py-1.5 text-xs text-gray-400">
        Lat: {lngLat.lat.toFixed(4)}, Lng: {lngLat.lng.toFixed(4)}
      </div>
    </div>
  );
}
