"use client";

import { useState, useMemo, useCallback } from "react";
import {
  PencilSquareIcon,
  CheckIcon,
  MapPinIcon,
  ClockIcon,
  EnvelopeIcon,
  GlobeAmericasIcon,
} from "@heroicons/react/24/outline";
import { calculateAreaSqMiles } from "@/lib/territories/mapbox";
import * as turf from "@turf/turf";
import IsochroneControls from "./IsochroneControls";
import ZipCodeSelector from "./ZipCodeSelector";
import AdminBoundarySelector from "./AdminBoundarySelector";

export interface NewTerritoryData {
  name: string;
  state: string;
  description: string;
  status: string;
  boundaryType: string;
  boundaryGeoJson: unknown;
  centerLat: number;
  centerLng: number;
  radiusMiles?: number;
  travelMode?: string;
  travelMinutes?: number;
  color: string;
}

interface TerritoryCreationWizardProps {
  onComplete: (territory: NewTerritoryData) => void;
  onCancel: () => void;
  drawnGeometry?: GeoJSON.Feature | null;
  onStartDrawing: (mode: "radius" | "polygon" | "rectangle") => void;
}

type BoundaryMethod = "radius" | "polygon" | "isochrone" | "zipcode" | "admin";

const STEPS = ["Method", "Configure", "Details", "Review"];

const BOUNDARY_TYPE_MAP: Record<string, string> = {
  radius: "ISODISTANCE",
  polygon: "MANUAL_DRAW",
  isochrone: "ISOCHRONE",
  zipcode: "ZIP_CODES",
  admin: "ADMIN_BOUNDARY",
};

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const BRAND_COLORS = [
  { name: "Navy", value: "#2D2F8E" },
  { name: "Purple", value: "#6A469D" },
  { name: "Cyan", value: "#50C8DF" },
  { name: "Green", value: "#34B256" },
  { name: "Yellow", value: "#FACC29" },
  { name: "Orange", value: "#F79A30" },
];

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "COMING_SOON", label: "Coming Soon" },
];

function CircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function PolygonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path d="M4 18L12 4L20 18H4Z" strokeLinejoin="round" />
    </svg>
  );
}

const METHOD_CARDS: {
  id: BoundaryMethod;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}[] = [
  {
    id: "radius",
    label: "Radius Circle",
    description: "Draw a circle with a center point and radius",
    icon: CircleIcon,
    enabled: true,
  },
  {
    id: "polygon",
    label: "Freehand Polygon",
    description: "Draw a custom boundary shape",
    icon: PencilSquareIcon,
    enabled: true,
  },
  {
    id: "isochrone",
    label: "Isochrone",
    description: "Define area by drive/walk time",
    icon: ClockIcon,
    enabled: true,
  },
  {
    id: "zipcode",
    label: "ZIP Codes",
    description: "Select ZIP code boundaries",
    icon: EnvelopeIcon,
    enabled: true,
  },
  {
    id: "admin",
    label: "Admin Boundary",
    description: "Select state/county/city boundaries",
    icon: GlobeAmericasIcon,
    enabled: true,
  },
];

export default function TerritoryCreationWizard({
  onComplete,
  onCancel,
  drawnGeometry,
  onStartDrawing,
}: TerritoryCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<BoundaryMethod | null>(null);
  const [manualCenterLat, setManualCenterLat] = useState("");
  const [manualCenterLng, setManualCenterLng] = useState("");
  const [manualRadius, setManualRadius] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("AVAILABLE");
  const [color, setColor] = useState(BRAND_COLORS[0].value);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [generatedBoundary, setGeneratedBoundary] = useState<GeoJSON.Feature | null>(null);
  const [generatedArea, setGeneratedArea] = useState<number | null>(null);

  const handleBoundaryGenerated = useCallback(
    (boundary: GeoJSON.Feature, area?: number) => {
      setGeneratedBoundary(boundary);
      if (area) setGeneratedArea(area);
    },
    []
  );

  const areaSqMiles = useMemo(() => {
    if (!drawnGeometry) return null;
    try {
      return calculateAreaSqMiles(
        drawnGeometry as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
      );
    } catch {
      return null;
    }
  }, [drawnGeometry]);

  const geometryCenter = useMemo(() => {
    if (!drawnGeometry) return null;
    try {
      const centroid = turf.centroid(drawnGeometry);
      return {
        lng: centroid.geometry.coordinates[0],
        lat: centroid.geometry.coordinates[1],
      };
    } catch {
      return null;
    }
  }, [drawnGeometry]);

  const vertexCount = useMemo(() => {
    if (!drawnGeometry || drawnGeometry.geometry.type !== "Polygon") return null;
    const coords = (drawnGeometry.geometry as GeoJSON.Polygon).coordinates[0];
    return coords ? coords.length - 1 : null;
  }, [drawnGeometry]);

  const radiusFromGeometry = useMemo(() => {
    if (!drawnGeometry || !geometryCenter) return null;
    if (selectedMethod !== "radius") return null;
    try {
      const coords = (drawnGeometry.geometry as GeoJSON.Polygon).coordinates[0];
      if (!coords || coords.length === 0) return null;
      const edgePoint = turf.point(coords[0]);
      const centerPoint = turf.point([geometryCenter.lng, geometryCenter.lat]);
      return turf.distance(centerPoint, edgePoint, { units: "miles" });
    } catch {
      return null;
    }
  }, [drawnGeometry, geometryCenter, selectedMethod]);

  function validateStep(): boolean {
    setValidationError(null);

    if (currentStep === 0) {
      if (!selectedMethod) {
        setValidationError("Please select a boundary method.");
        return false;
      }
    }

    if (currentStep === 1) {
      if (!drawnGeometry && !generatedBoundary) {
        if (selectedMethod === "radius") {
          if (!manualCenterLat || !manualCenterLng || !manualRadius) {
            setValidationError(
              "Draw on the map or enter center coordinates and radius manually."
            );
            return false;
          }
          const lat = parseFloat(manualCenterLat);
          const lng = parseFloat(manualCenterLng);
          const r = parseFloat(manualRadius);
          if (isNaN(lat) || lat < -90 || lat > 90) {
            setValidationError("Latitude must be between -90 and 90.");
            return false;
          }
          if (isNaN(lng) || lng < -180 || lng > 180) {
            setValidationError("Longitude must be between -180 and 180.");
            return false;
          }
          if (isNaN(r) || r <= 0) {
            setValidationError("Radius must be a positive number.");
            return false;
          }
        } else if (selectedMethod === "isochrone" || selectedMethod === "zipcode" || selectedMethod === "admin") {
          setValidationError("Please generate a boundary using the controls above.");
          return false;
        } else {
          setValidationError("Please draw your territory boundary on the map.");
          return false;
        }
      }
    }

    if (currentStep === 2) {
      if (!name.trim()) {
        setValidationError("Territory name is required.");
        return false;
      }
      if (!state) {
        setValidationError("Please select a state.");
        return false;
      }
    }

    return true;
  }

  function handleNext() {
    if (!validateStep()) return;
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function handleBack() {
    setValidationError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  function handleSave() {
    let boundaryGeoJson: unknown = null;
    let centerLat = 0;
    let centerLng = 0;
    let radiusMiles: number | undefined;

    if (drawnGeometry) {
      boundaryGeoJson = drawnGeometry;
      if (geometryCenter) {
        centerLat = geometryCenter.lat;
        centerLng = geometryCenter.lng;
      }
      if (selectedMethod === "radius" && radiusFromGeometry) {
        radiusMiles = radiusFromGeometry;
      }
    } else if (generatedBoundary) {
      boundaryGeoJson = generatedBoundary;
      try {
        const centroid = turf.centroid(generatedBoundary);
        centerLat = centroid.geometry.coordinates[1];
        centerLng = centroid.geometry.coordinates[0];
      } catch { /* use defaults */ }
    } else if (selectedMethod === "radius") {
      centerLat = parseFloat(manualCenterLat);
      centerLng = parseFloat(manualCenterLng);
      radiusMiles = parseFloat(manualRadius);
      const circle = turf.circle([centerLng, centerLat], radiusMiles, {
        steps: 64,
        units: "miles",
      });
      boundaryGeoJson = circle;
    }

    onComplete({
      name: name.trim(),
      state,
      description: description.trim(),
      status,
      boundaryType: BOUNDARY_TYPE_MAP[selectedMethod || "radius"],
      boundaryGeoJson,
      centerLat,
      centerLng,
      radiusMiles,
      color,
    });
  }

  function renderStepIndicator() {
    return (
      <div className="flex items-center justify-between px-2 pb-4">
        {STEPS.map((label, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          return (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    isCompleted
                      ? "bg-brand-green text-white"
                      : isActive
                        ? "bg-brand-navy text-white"
                        : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`mt-1 text-[10px] ${
                    isActive ? "font-semibold text-brand-navy" : "text-gray-500"
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-1 mt-[-12px] h-0.5 w-6 ${
                    index < currentStep ? "bg-brand-green" : "bg-gray-300"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderChooseMethod() {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          How would you like to define this territory?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {METHOD_CARDS.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;
            return (
              <button
                key={method.id}
                type="button"
                disabled={!method.enabled}
                onClick={() => {
                  if (method.enabled) {
                    setSelectedMethod(method.id);
                    setValidationError(null);
                  }
                }}
                className={`relative rounded-xl border p-4 text-left transition-all ${
                  !method.enabled
                    ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                    : isSelected
                      ? "border-brand-navy bg-blue-50 ring-1 ring-brand-navy"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                {!method.enabled && (
                  <span className="absolute right-2 top-2 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    Coming Soon
                  </span>
                )}
                <Icon
                  className={`h-6 w-6 ${
                    !method.enabled
                      ? "text-gray-400"
                      : isSelected
                        ? "text-brand-navy"
                        : "text-gray-600"
                  }`}
                />
                <p
                  className={`mt-2 text-sm font-medium ${
                    !method.enabled
                      ? "text-gray-400"
                      : isSelected
                        ? "text-brand-navy"
                        : "text-gray-900"
                  }`}
                >
                  {method.label}
                </p>
                <p
                  className={`mt-0.5 text-xs ${
                    !method.enabled ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {method.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderConfigure() {
    if (selectedMethod === "radius") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Click the map to set center, then click again to set radius.
          </p>
          <button
            type="button"
            onClick={() => onStartDrawing("radius")}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-opacity-90"
          >
            <MapPinIcon className="h-4 w-4" />
            Start Drawing on Map
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-500">
                or enter manually
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Center Latitude
              </label>
              <input
                type="number"
                step="any"
                value={manualCenterLat}
                onChange={(e) => setManualCenterLat(e.target.value)}
                placeholder="36.1627"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Center Longitude
              </label>
              <input
                type="number"
                step="any"
                value={manualCenterLng}
                onChange={(e) => setManualCenterLng(e.target.value)}
                placeholder="-86.7816"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Radius (miles)
            </label>
            <input
              type="number"
              step="any"
              min="0.1"
              value={manualRadius}
              onChange={(e) => setManualRadius(e.target.value)}
              placeholder="10"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
            />
          </div>

          {drawnGeometry && geometryCenter && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-medium text-green-800">
                Boundary drawn successfully
              </p>
              <div className="mt-1 space-y-0.5 text-xs text-green-700">
                <p>
                  Center: {geometryCenter.lat.toFixed(4)},{" "}
                  {geometryCenter.lng.toFixed(4)}
                </p>
                {radiusFromGeometry && (
                  <p>Radius: {radiusFromGeometry.toFixed(2)} miles</p>
                )}
                {areaSqMiles != null && (
                  <p>Area: {areaSqMiles.toFixed(2)} sq miles</p>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (selectedMethod === "polygon") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Click on the map to draw your territory boundary.
          </p>
          <button
            type="button"
            onClick={() => onStartDrawing("polygon")}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-opacity-90"
          >
            <PencilSquareIcon className="h-4 w-4" />
            Start Drawing on Map
          </button>

          {drawnGeometry && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-medium text-green-800">
                Boundary drawn successfully
              </p>
              <div className="mt-1 space-y-0.5 text-xs text-green-700">
                {vertexCount != null && <p>Vertices: {vertexCount}</p>}
                {areaSqMiles != null && (
                  <p>Area: {areaSqMiles.toFixed(2)} sq miles</p>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (selectedMethod === "isochrone") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Generate a territory based on travel time from a center point.
          </p>
          <IsochroneControls
            center={geometryCenter ? [geometryCenter.lng, geometryCenter.lat] : null}
            onGenerate={(polygon) => handleBoundaryGenerated(polygon)}
          />
          {generatedBoundary && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-medium text-green-800">
                Isochrone boundary generated
              </p>
              {generatedArea != null && (
                <p className="mt-1 text-xs text-green-700">
                  Area: {generatedArea.toFixed(2)} sq miles
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    if (selectedMethod === "zipcode") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select ZIP codes to define your territory boundary.
          </p>
          <ZipCodeSelector
            onComplete={(polygon) => handleBoundaryGenerated(polygon)}
            onCancel={() => setSelectedMethod(null)}
          />
          {generatedBoundary && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-medium text-green-800">
                ZIP boundary merged
              </p>
              {generatedArea != null && (
                <p className="mt-1 text-xs text-green-700">
                  Area: {generatedArea.toFixed(2)} sq miles
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    if (selectedMethod === "admin") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select a state or county boundary as your territory.
          </p>
          <AdminBoundarySelector
            onComplete={(polygon) => handleBoundaryGenerated(polygon)}
            onCancel={() => setSelectedMethod(null)}
          />
          {generatedBoundary && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-medium text-green-800">
                Admin boundary loaded
              </p>
              {generatedArea != null && (
                <p className="mt-1 text-xs text-green-700">
                  Area: {generatedArea.toFixed(2)} sq miles
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  function renderDetails() {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Territory Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Westside Metro"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">
            State <span className="text-red-500">*</span>
          </label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
          >
            <option value="">Select a state</option>
            {US_STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional description of this territory..."
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Color
          </label>
          <div className="mt-2 flex gap-2">
            {BRAND_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onClick={() => setColor(c.value)}
                className={`h-8 w-8 rounded-full border-2 transition-all ${
                  color === c.value
                    ? "border-gray-900 ring-2 ring-gray-900 ring-offset-2"
                    : "border-transparent hover:border-gray-400"
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderReview() {
    const stateLabel =
      US_STATES.find((s) => s.value === state)?.label || state;
    const statusLabel =
      STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
    const methodLabel =
      METHOD_CARDS.find((m) => m.id === selectedMethod)?.label || selectedMethod;
    const colorName =
      BRAND_COLORS.find((c) => c.value === color)?.name || color;

    let displayArea = areaSqMiles;
    if (!displayArea && selectedMethod === "radius" && manualRadius) {
      const r = parseFloat(manualRadius);
      if (!isNaN(r)) {
        displayArea = Math.PI * r * r;
      }
    }

    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-gray-900">Review Territory</p>
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-gray-500">Name</span>
            <span className="text-sm font-medium text-gray-900">{name}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-gray-500">State</span>
            <span className="text-sm text-gray-900">{stateLabel}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-gray-500">Method</span>
            <span className="text-sm text-gray-900">{methodLabel}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-gray-500">Status</span>
            <span className="text-sm text-gray-900">{statusLabel}</span>
          </div>
          {displayArea != null && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-gray-500">Area</span>
              <span className="text-sm text-gray-900">
                {displayArea.toFixed(2)} sq miles
              </span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-gray-500">Color</span>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-gray-900">{colorName}</span>
            </div>
          </div>
          {description && (
            <div className="px-4 py-2.5">
              <span className="text-xs text-gray-500">Description</span>
              <p className="mt-0.5 text-sm text-gray-900">{description}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-opacity-90"
        >
          Save Territory
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Create Territory
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {renderStepIndicator()}

        {validationError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {validationError}
          </div>
        )}

        {currentStep === 0 && renderChooseMethod()}
        {currentStep === 1 && renderConfigure()}
        {currentStep === 2 && renderDetails()}
        {currentStep === 3 && renderReview()}
      </div>

      {currentStep < 3 && (
        <div className="flex gap-2 border-t border-gray-200 px-4 py-3">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-opacity-90"
          >
            Next
          </button>
        </div>
      )}

      {currentStep === 3 && (
        <div className="border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
