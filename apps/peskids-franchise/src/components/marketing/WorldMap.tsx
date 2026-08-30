"use client";

import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Market locations with coordinates [longitude, latitude]
const corporateMarkets = [
  { name: "New York City", coordinates: [-74.006, 40.7128] as [number, number], region: "NY" },
  { name: "Los Angeles", coordinates: [-118.2437, 34.0522] as [number, number], region: "CA" },
  { name: "San Francisco", coordinates: [-122.4194, 37.7749] as [number, number], region: "CA" },
  { name: "Hong Kong", coordinates: [114.1694, 22.3193] as [number, number], region: "China" },
];

const franchiseMarkets = [
  { name: "Singapore", coordinates: [103.8198, 1.3521] as [number, number], region: "" },
  { name: "Westside", coordinates: [-86.7816, 36.1627] as [number, number], region: "TN" },
  { name: "Eastside", coordinates: [-81.3792, 28.5383] as [number, number], region: "FL" },
];

export { corporateMarkets, franchiseMarkets };

export default function WorldMap() {
  return (
    <div className="relative bg-gradient-to-b from-blue-50 to-slate-100 rounded-xl overflow-hidden border border-slate-200">
      <div className="relative" style={{ height: "380px", overflow: "hidden" }}>
        <div style={{ marginTop: "-170px" }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 140,
              center: [0, 35],
            }}
            style={{ width: "100%", height: "auto" }}
          >
            <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={4} center={[0, 35]}>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#E2E8F0"
                      stroke="#CBD5E1"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "#CBD5E1", outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>

              {/* Corporate Market Markers (Purple) */}
              {corporateMarkets.map((market, i) => (
                <Marker key={`corp-${i}`} coordinates={market.coordinates}>
                  <g transform="translate(-12, -24)">
                    <path
                      d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8z"
                      fill="#6A469D"
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                    <circle cx="12" cy="8" r="3" fill="#fff" />
                  </g>
                  <title>{market.name}{market.region ? `, ${market.region}` : ""} (Corporate)</title>
                </Marker>
              ))}

              {/* Franchise Market Markers (Cyan) */}
              {franchiseMarkets.map((market, i) => (
                <Marker key={`fran-${i}`} coordinates={market.coordinates}>
                  <g transform="translate(-12, -24)">
                    <path
                      d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8z"
                      fill="#50C8DF"
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                    <circle cx="12" cy="8" r="3" fill="#fff" />
                  </g>
                  <title>{market.name}{market.region ? `, ${market.region}` : ""} (Franchise Partner)</title>
                </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>
        </div>
      </div>
    </div>
  );
}
