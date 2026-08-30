"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";
import {
  MAPBOX_TOKEN,
  MAP_STYLES,
  MapStyleKey,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  territoriesToGeoJSON,
  getStatusColor,
  type TerritoryData,
} from "@/lib/territories/mapbox";

interface MapCanvasProps {
  territories: TerritoryData[];
  selectedTerritoryId?: string | null;
  onTerritoryClick?: (territoryId: string) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  onMapRightClick?: (
    lngLat: { lng: number; lat: number },
    point: { x: number; y: number }
  ) => void;
  drawingMode?: "radius" | "polygon" | "rectangle" | null;
  onDrawComplete?: (geometry: GeoJSON.Feature) => void;
  onMapReady?: (handle: MapCanvasHandle) => void;
  className?: string;
}

export interface MapCanvasHandle {
  flyTo: (center: [number, number], zoom?: number) => void;
  fitBounds: (
    bounds: [[number, number], [number, number]],
    padding?: number
  ) => void;
  getMap: () => mapboxgl.Map | null;
  setStyle: (style: MapStyleKey) => void;
}

const STYLE_LABELS: Record<MapStyleKey, string> = {
  streets: "Streets",
  satellite: "Satellite",
  light: "Light",
  dark: "Dark",
};

const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas(
    {
      territories,
      selectedTerritoryId,
      onTerritoryClick,
      onMapClick,
      onMapRightClick,
      drawingMode,
      onDrawComplete,
      onMapReady,
      className,
    },
    ref
  ) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [activeStyle, setActiveStyle] = useState<MapStyleKey>("streets");

    // Drawing state
    const drawingStateRef = useRef<{
      points: [number, number][];
      marker?: mapboxgl.Marker;
      markers: mapboxgl.Marker[];
    }>({ points: [], markers: [] });

    // Build the handle object
    const handleRef = useRef<MapCanvasHandle | null>(null);

    if (!handleRef.current) {
      handleRef.current = {
        flyTo: (center: [number, number], zoom?: number) => {
          mapRef.current?.flyTo({ center, zoom: zoom ?? mapRef.current.getZoom() });
        },
        fitBounds: (
          bounds: [[number, number], [number, number]],
          padding?: number
        ) => {
          mapRef.current?.fitBounds(bounds, { padding: padding ?? 50 });
        },
        getMap: () => mapRef.current,
        setStyle: (style: MapStyleKey) => {
          handleStyleChange(style);
        },
      };
    }

    // Imperative handle (for ref-based usage)
    useImperativeHandle(ref, () => handleRef.current!);

    // Notify parent via callback (reliable with next/dynamic)
    useEffect(() => {
      if (mapLoaded && handleRef.current) {
        onMapReady?.(handleRef.current);
      }
    }, [mapLoaded, onMapReady]);

    // Initialize map
    useEffect(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLES.streets,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
        }),
        "top-right"
      );
      map.addControl(new mapboxgl.FullscreenControl(), "top-right");
      map.addControl(
        new mapboxgl.ScaleControl({ unit: "imperial" }),
        "bottom-left"
      );

      map.on("load", () => {
        setMapLoaded(true);
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
        setMapLoaded(false);
      };
    }, []);

    // Add territory layers once map is loaded
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      const geojson = territoriesToGeoJSON(territories);

      if (map.getSource("territories")) {
        (map.getSource("territories") as mapboxgl.GeoJSONSource).setData(
          geojson
        );
      } else {
        map.addSource("territories", {
          type: "geojson",
          data: geojson,
        });

        map.addLayer({
          id: "territory-fill",
          type: "fill",
          source: "territories",
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 0.2,
          },
        });

        map.addLayer({
          id: "territory-border",
          type: "line",
          source: "territories",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 2,
          },
        });

        map.addLayer({
          id: "territory-border-selected",
          type: "line",
          source: "territories",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 3,
            "line-dasharray": [3, 2],
          },
          filter: ["==", ["get", "id"], ""],
        });

        map.addLayer({
          id: "territory-labels",
          type: "symbol",
          source: "territories",
          layout: {
            "text-field": ["get", "name"],
            "text-size": 12,
            "text-anchor": "center",
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#1f2937",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.5,
          },
        });
      }
    }, [territories, mapLoaded]);

    // Update selected territory filter
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      if (map.getLayer("territory-border-selected")) {
        map.setFilter("territory-border-selected", [
          "==",
          ["get", "id"],
          selectedTerritoryId || "",
        ]);
      }
    }, [selectedTerritoryId, mapLoaded]);

    // Click handlers for territories
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      const handleClick = (e: mapboxgl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["territory-fill"],
        });

        if (features.length > 0 && features[0].properties?.id) {
          onTerritoryClick?.(features[0].properties.id);
        } else if (!drawingMode) {
          onMapClick?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        }
      };

      const handleContextMenu = (e: mapboxgl.MapMouseEvent) => {
        e.preventDefault();
        onMapRightClick?.(
          { lng: e.lngLat.lng, lat: e.lngLat.lat },
          { x: e.point.x, y: e.point.y }
        );
      };

      const handleMouseEnter = () => {
        if (!drawingMode) {
          map.getCanvas().style.cursor = "pointer";
        }
      };

      const handleMouseLeave = () => {
        if (!drawingMode) {
          map.getCanvas().style.cursor = "";
        }
      };

      map.on("click", handleClick);
      map.on("contextmenu", handleContextMenu);
      map.on("mouseenter", "territory-fill", handleMouseEnter);
      map.on("mouseleave", "territory-fill", handleMouseLeave);

      return () => {
        map.off("click", handleClick);
        map.off("contextmenu", handleContextMenu);
        map.off("mouseenter", "territory-fill", handleMouseEnter);
        map.off("mouseleave", "territory-fill", handleMouseLeave);
      };
    }, [mapLoaded, drawingMode, onTerritoryClick, onMapClick, onMapRightClick]);

    // Drawing mode
    const clearDrawing = useCallback(() => {
      const state = drawingStateRef.current;
      state.points = [];
      state.marker?.remove();
      state.marker = undefined;
      state.markers.forEach((m) => m.remove());
      state.markers = [];

      const map = mapRef.current;
      if (map) {
        if (map.getLayer("drawing-preview-fill")) map.removeLayer("drawing-preview-fill");
        if (map.getLayer("drawing-preview-line")) map.removeLayer("drawing-preview-line");
        if (map.getLayer("drawing-preview-label")) map.removeLayer("drawing-preview-label");
        if (map.getSource("drawing-preview")) map.removeSource("drawing-preview");
      }
    }, []);

    const ensureDrawingSource = useCallback(() => {
      const map = mapRef.current;
      if (!map) return;

      if (!map.getSource("drawing-preview")) {
        map.addSource("drawing-preview", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "drawing-preview-fill",
          type: "fill",
          source: "drawing-preview",
          paint: {
            "fill-color": "#2D2F8E",
            "fill-opacity": 0.15,
          },
        });
        map.addLayer({
          id: "drawing-preview-line",
          type: "line",
          source: "drawing-preview",
          paint: {
            "line-color": "#2D2F8E",
            "line-width": 2,
            "line-dasharray": [4, 2],
          },
        });
        map.addLayer({
          id: "drawing-preview-label",
          type: "symbol",
          source: "drawing-preview",
          layout: {
            "text-field": ["get", "label"],
            "text-size": 13,
            "text-anchor": "center",
            "text-offset": [0, -1.5],
          },
          paint: {
            "text-color": "#2D2F8E",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2,
          },
        });
      }
    }, []);

    const updateDrawingPreview = useCallback(
      (geojson: GeoJSON.FeatureCollection) => {
        const map = mapRef.current;
        if (!map) return;
        ensureDrawingSource();
        const source = map.getSource("drawing-preview") as mapboxgl.GeoJSONSource;
        if (source) source.setData(geojson);
      },
      [ensureDrawingSource]
    );

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      if (!drawingMode) {
        clearDrawing();
        map.getCanvas().style.cursor = "";
        return;
      }

      map.getCanvas().style.cursor = "crosshair";
      clearDrawing();

      const handleDrawClick = (e: mapboxgl.MapMouseEvent) => {
        // Ignore if click was on a territory
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["territory-fill"],
        });
        if (features.length > 0) return;

        const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        const state = drawingStateRef.current;

        if (drawingMode === "radius") {
          if (state.points.length === 0) {
            state.points.push(point);
            const marker = new mapboxgl.Marker({ color: "#2D2F8E" })
              .setLngLat(point)
              .addTo(map);
            state.marker = marker;
          } else {
            const center = state.points[0];
            const radiusMiles = turf.distance(center, point, {
              units: "miles",
            });
            const circle = turf.circle(center, radiusMiles, {
              steps: 64,
              units: "miles",
            });
            circle.properties = {
              ...circle.properties,
              radiusMiles,
              center,
            };
            clearDrawing();
            onDrawComplete?.(circle);
          }
        } else if (drawingMode === "polygon") {
          state.points.push(point);
          const dot = new mapboxgl.Marker({
            color: "#2D2F8E",
            scale: 0.5,
          })
            .setLngLat(point)
            .addTo(map);
          state.markers.push(dot);

          if (state.points.length >= 2) {
            const lineCoords = [...state.points];
            const fc: GeoJSON.FeatureCollection = {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: lineCoords,
                  },
                  properties: {
                    label: `${state.points.length} vertices`,
                  },
                },
              ],
            };
            updateDrawingPreview(fc);
          }
        } else if (drawingMode === "rectangle") {
          if (state.points.length === 0) {
            state.points.push(point);
            const marker = new mapboxgl.Marker({
              color: "#2D2F8E",
              scale: 0.5,
            })
              .setLngLat(point)
              .addTo(map);
            state.markers.push(marker);
          } else {
            const [lng1, lat1] = state.points[0];
            const [lng2, lat2] = point;
            const rect: GeoJSON.Feature<GeoJSON.Polygon> = {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [lng1, lat1],
                    [lng2, lat1],
                    [lng2, lat2],
                    [lng1, lat2],
                    [lng1, lat1],
                  ],
                ],
              },
              properties: {},
            };
            clearDrawing();
            onDrawComplete?.(rect);
          }
        }
      };

      const handleDrawDblClick = (e: mapboxgl.MapMouseEvent) => {
        if (drawingMode !== "polygon") return;
        e.preventDefault();

        const state = drawingStateRef.current;
        if (state.points.length < 3) return;

        const coords = [...state.points, state.points[0]];
        const polygon: GeoJSON.Feature<GeoJSON.Polygon> = {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [coords],
          },
          properties: {},
        };
        clearDrawing();
        onDrawComplete?.(polygon);
      };

      const handleDrawMouseMove = (e: mapboxgl.MapMouseEvent) => {
        const state = drawingStateRef.current;
        const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];

        if (drawingMode === "radius" && state.points.length === 1) {
          const center = state.points[0];
          const radiusMiles = turf.distance(center, point, { units: "miles" });
          const circle = turf.circle(center, radiusMiles, {
            steps: 64,
            units: "miles",
          });
          const centroid = turf.centroid(circle);
          const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [
              {
                ...circle,
                properties: {
                  label: `${radiusMiles.toFixed(1)} mi`,
                },
              },
              {
                ...centroid,
                properties: {
                  label: `${radiusMiles.toFixed(1)} mi`,
                },
              },
            ],
          };
          updateDrawingPreview(fc);
        } else if (drawingMode === "polygon" && state.points.length >= 1) {
          const lineCoords = [...state.points, point];
          const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: lineCoords,
                },
                properties: {
                  label: `${state.points.length} vertices`,
                },
              },
            ],
          };
          updateDrawingPreview(fc);
        } else if (drawingMode === "rectangle" && state.points.length === 1) {
          const [lng1, lat1] = state.points[0];
          const [lng2, lat2] = [point[0], point[1]];
          const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    [
                      [lng1, lat1],
                      [lng2, lat1],
                      [lng2, lat2],
                      [lng1, lat2],
                      [lng1, lat1],
                    ],
                  ],
                },
                properties: { label: "" },
              },
            ],
          };
          updateDrawingPreview(fc);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          clearDrawing();
        }
      };

      map.on("click", handleDrawClick);
      map.on("dblclick", handleDrawDblClick);
      map.on("mousemove", handleDrawMouseMove);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        map.off("click", handleDrawClick);
        map.off("dblclick", handleDrawDblClick);
        map.off("mousemove", handleDrawMouseMove);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [
      drawingMode,
      mapLoaded,
      onDrawComplete,
      clearDrawing,
      updateDrawingPreview,
    ]);

    // Style change handler
    const handleStyleChange = useCallback(
      (style: MapStyleKey) => {
        const map = mapRef.current;
        if (!map) return;

        setActiveStyle(style);
        map.setStyle(MAP_STYLES[style]);

        map.once("style.load", () => {
          // Re-add territory source and layers after style change
          const geojson = territoriesToGeoJSON(territories);

          map.addSource("territories", {
            type: "geojson",
            data: geojson,
          });

          map.addLayer({
            id: "territory-fill",
            type: "fill",
            source: "territories",
            paint: {
              "fill-color": ["get", "color"],
              "fill-opacity": 0.2,
            },
          });

          map.addLayer({
            id: "territory-border",
            type: "line",
            source: "territories",
            paint: {
              "line-color": ["get", "color"],
              "line-width": 2,
            },
          });

          map.addLayer({
            id: "territory-border-selected",
            type: "line",
            source: "territories",
            paint: {
              "line-color": ["get", "color"],
              "line-width": 3,
              "line-dasharray": [3, 2],
            },
            filter: [
              "==",
              ["get", "id"],
              selectedTerritoryId || "",
            ],
          });

          map.addLayer({
            id: "territory-labels",
            type: "symbol",
            source: "territories",
            layout: {
              "text-field": ["get", "name"],
              "text-size": 12,
              "text-anchor": "center",
              "text-allow-overlap": false,
            },
            paint: {
              "text-color": "#1f2937",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1.5,
            },
          });
        });
      },
      [territories, selectedTerritoryId]
    );

    return (
      <div className={`relative w-full h-full ${className || ""}`}>
        <div ref={mapContainerRef} className="w-full h-full" />

        <div className="absolute top-3 left-3 z-10 flex rounded-lg overflow-hidden shadow-md">
          {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => (
            <button
              key={key}
              onClick={() => handleStyleChange(key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeStyle === key
                  ? "bg-brand-navy text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              } ${key !== "streets" ? "border-l border-gray-200" : ""}`}
            >
              {STYLE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>
    );
  }
);

export default MapCanvas;
