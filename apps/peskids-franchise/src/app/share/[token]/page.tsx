"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";
import { MAPBOX_TOKEN, getStatusColor } from "@/lib/territories/mapbox";

export const dynamic = "force-dynamic";

interface SharedTerritory {
  id: string;
  name: string;
  state: string;
  status: string;
  boundaryGeoJson?: unknown;
  centerLat?: number | null;
  centerLng?: number | null;
  radiusMiles?: number | null;
  color?: string | null;
  population?: number | null;
  medianIncome?: number | null;
  territoryScore?: number | null;
}

export default function SharedMapPage() {
  const params = useParams();
  const token = params.token as string;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [territories, setTerritories] = useState<SharedTerritory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSharedMap();
  }, [token]);

  const fetchSharedMap = async () => {
    try {
      const res = await fetch(`/api/public/territories/share/${token}`);
      if (!res.ok) {
        if (res.status === 404) setError("This shared map link has expired or doesn't exist.");
        else setError("Failed to load shared map.");
        return;
      }
      const data = await res.json();
      setTerritories(data.territories || []);
    } catch {
      setError("Failed to load shared map.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN || territories.length === 0) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-98.5795, 39.8283],
      zoom: 4,
      interactive: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      const features: GeoJSON.Feature[] = [];

      for (const territory of territories) {
        let geometry: GeoJSON.Geometry | null = null;
        if (territory.boundaryGeoJson) {
          const geo = territory.boundaryGeoJson as GeoJSON.Geometry | GeoJSON.Feature;
          geometry = "type" in geo && geo.type === "Feature"
            ? (geo as GeoJSON.Feature).geometry
            : (geo as GeoJSON.Geometry);
        } else if (territory.centerLat && territory.centerLng && territory.radiusMiles) {
          const circle = turf.circle(
            [territory.centerLng, territory.centerLat],
            territory.radiusMiles,
            { steps: 64, units: "miles" }
          );
          geometry = circle.geometry;
        }

        if (geometry) {
          features.push({
            type: "Feature",
            geometry,
            properties: {
              name: territory.name,
              color: territory.color || getStatusColor(territory.status),
            },
          });
        }
      }

      if (features.length > 0) {
        map.addSource("shared-territories", {
          type: "geojson",
          data: { type: "FeatureCollection", features },
        });

        map.addLayer({
          id: "shared-fill",
          type: "fill",
          source: "shared-territories",
          paint: { "fill-color": ["get", "color"], "fill-opacity": 0.25 },
        });

        map.addLayer({
          id: "shared-border",
          type: "line",
          source: "shared-territories",
          paint: { "line-color": ["get", "color"], "line-width": 2.5 },
        });

        map.addLayer({
          id: "shared-labels",
          type: "symbol",
          source: "shared-territories",
          layout: { "text-field": ["get", "name"], "text-size": 13, "text-anchor": "center" },
          paint: { "text-color": "#1f2937", "text-halo-color": "#fff", "text-halo-width": 2 },
        });

        const collection = turf.featureCollection(features);
        const bbox = turf.bbox(collection);
        map.fitBounds(
          [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
          { padding: 60 }
        );
      }
    });

    return () => { map.remove(); };
  }, [territories]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-navy mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading shared map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🗺️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Map Unavailable</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-brand-navy">Acme Franchise</h1>
            <p className="text-xs text-gray-500">Shared Territory Map</p>
          </div>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
            {territories.length} {territories.length === 1 ? "territory" : "territories"}
          </span>
        </div>
      </header>

      <div ref={mapContainerRef} className="w-full" style={{ height: "calc(100vh - 57px)" }} />
    </div>
  );
}
