"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LinkButton } from "@/components/shared/Button";

interface Market {
  name: string;
  state: string;
  status: "ACTIVE" | "AVAILABLE" | "COMING_SOON" | "RESERVED";
  lat: number;
  lng: number;
  description: string;
}

interface MarketMapProps {
  markets: Market[];
}

const statusColors = {
  ACTIVE: "#34B256",
  AVAILABLE: "#50C8DF",
  COMING_SOON: "#FACC29",
  RESERVED: "#6A469D",
};

const statusLabels = {
  ACTIVE: "Active",
  AVAILABLE: "Available",
  COMING_SOON: "Coming Soon",
  RESERVED: "Reserved",
};

function createIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

export default function MarketMap({ markets }: MarketMapProps) {
  // Center the map on the US
  const center: [number, number] = [37.0902, -95.7129];

  return (
    <MapContainer
      center={center}
      zoom={4}
      scrollWheelZoom={false}
      style={{ height: "500px", width: "100%" }}
      className="rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markets.map((market) => (
        <Marker
          key={`${market.name}-${market.state}`}
          position={[market.lat, market.lng]}
          icon={createIcon(statusColors[market.status])}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-brand-navy">
                  {market.name}, {market.state}
                </h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: statusColors[market.status] }}
                >
                  {statusLabels[market.status]}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{market.description}</p>
              {market.status === "AVAILABLE" && (
                <LinkButton
                  href={`/contact?territory=${encodeURIComponent(
                    `${market.name}, ${market.state}`
                  )}`}
                  size="sm"
                  className="w-full"
                >
                  Inquire
                </LinkButton>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
