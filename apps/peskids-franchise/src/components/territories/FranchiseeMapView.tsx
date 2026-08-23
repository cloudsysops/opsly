"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN, getStatusColor } from "@/lib/territories/mapbox";
import * as turf from "@turf/turf";

interface Territory {
  id: string;
  name: string;
  state: string;
  status: string;
  boundaryGeoJson?: unknown;
  centerLat?: number | null;
  centerLng?: number | null;
  radiusMiles?: number | null;
  population?: number | null;
  medianIncome?: number | null;
  children5to12?: number | null;
  territoryScore?: number | null;
  color?: string | null;
}

interface FranchiseeMapViewProps {
  territory: Territory;
}

export default function FranchiseeMapView({
  territory,
}: FranchiseeMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [
        territory.centerLng || -98.5795,
        territory.centerLat || 39.8283,
      ],
      zoom: territory.radiusMiles
        ? Math.max(8, 14 - Math.log2(territory.radiusMiles))
        : 10,
      interactive: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(
      new mapboxgl.ScaleControl({ unit: "imperial" }),
      "bottom-left"
    );

    map.on("load", () => {
      setMapLoaded(true);

      let geometry: GeoJSON.Geometry | null = null;
      if (territory.boundaryGeoJson) {
        const geo = territory.boundaryGeoJson as
          | GeoJSON.Geometry
          | GeoJSON.Feature;
        geometry =
          "type" in geo && geo.type === "Feature"
            ? (geo as GeoJSON.Feature).geometry
            : (geo as GeoJSON.Geometry);
      } else if (
        territory.centerLat &&
        territory.centerLng &&
        territory.radiusMiles
      ) {
        const circle = turf.circle(
          [territory.centerLng, territory.centerLat],
          territory.radiusMiles,
          { steps: 64, units: "miles" }
        );
        geometry = circle.geometry;
      }

      if (geometry) {
        const feature: GeoJSON.Feature = {
          type: "Feature",
          geometry,
          properties: {
            name: territory.name,
            color: territory.color || getStatusColor(territory.status),
          },
        };

        map.addSource("my-territory", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [feature] },
        });

        map.addLayer({
          id: "territory-fill",
          type: "fill",
          source: "my-territory",
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 0.2,
          },
        });

        map.addLayer({
          id: "territory-border",
          type: "line",
          source: "my-territory",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 3,
          },
        });

        map.addLayer({
          id: "territory-label",
          type: "symbol",
          source: "my-territory",
          layout: {
            "text-field": ["get", "name"],
            "text-size": 14,
            "text-anchor": "center",
          },
          paint: {
            "text-color": "#1f2937",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2,
          },
        });

        const bbox = turf.bbox(feature);
        map.fitBounds(
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ],
          { padding: 40 }
        );
      }
    });

    return () => {
      map.remove();
    };
  }, [territory]);

  const areaSqMiles = territory.radiusMiles
    ? Math.PI * territory.radiusMiles * territory.radiusMiles
    : null;

  return (
    <div className="space-y-4">
      <div
        ref={mapContainerRef}
        className="w-full h-[400px] rounded-xl overflow-hidden border border-gray-200"
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="border-l-4 border-emerald-500 rounded-r-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Population</p>
          <p className="text-lg font-bold text-gray-900">
            {territory.population?.toLocaleString() || "--"}
          </p>
        </div>
        <div className="border-l-4 border-amber-500 rounded-r-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Median Income</p>
          <p className="text-lg font-bold text-gray-900">
            {territory.medianIncome
              ? `$${territory.medianIncome.toLocaleString()}`
              : "--"}
          </p>
        </div>
        <div className="border-l-4 border-purple-500 rounded-r-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Children 5-12</p>
          <p className="text-lg font-bold text-gray-900">
            {territory.children5to12?.toLocaleString() || "--"}
          </p>
        </div>
        <div className="border-l-4 border-cyan-500 rounded-r-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Territory Score</p>
          <p className="text-lg font-bold text-gray-900">
            {territory.territoryScore != null
              ? `${territory.territoryScore}/100`
              : "--"}
          </p>
        </div>
      </div>

      {areaSqMiles && (
        <p className="text-xs text-gray-500 text-center">
          Territory Area: {areaSqMiles.toFixed(1)} sq miles
        </p>
      )}
    </div>
  );
}
