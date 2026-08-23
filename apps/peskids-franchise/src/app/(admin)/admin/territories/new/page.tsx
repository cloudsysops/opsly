"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
  "Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "SOLD", label: "Sold" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMING_SOON", label: "Coming Soon" },
  { value: "UNAVAILABLE", label: "Unavailable" },
];

export default function NewTerritoryPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    state: "",
    description: "",
    status: "AVAILABLE",
    centerLat: "",
    centerLng: "",
    radiusMiles: "",
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) {
      errors.name = "Territory name is required.";
    }
    if (!form.state) {
      errors.state = "State is required.";
    }
    if (form.centerLat && isNaN(parseFloat(form.centerLat))) {
      errors.centerLat = "Must be a valid number.";
    }
    if (form.centerLng && isNaN(parseFloat(form.centerLng))) {
      errors.centerLng = "Must be a valid number.";
    }
    if (form.radiusMiles && isNaN(parseFloat(form.radiusMiles))) {
      errors.radiusMiles = "Must be a valid number.";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSaving(true);
      setError(null);

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        state: form.state,
        description: form.description.trim() || null,
        status: form.status,
        centerLat: form.centerLat ? parseFloat(form.centerLat) : null,
        centerLng: form.centerLng ? parseFloat(form.centerLng) : null,
        radiusMiles: form.radiusMiles ? parseFloat(form.radiusMiles) : null,
      };

      const response = await fetch("/api/admin/territories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create territory");
      }

      const data = await response.json();
      router.push(`/admin/territories/${data.territory.id}`);
    } catch (err) {
      console.error("Failed to create territory:", err);
      setError(err instanceof Error ? err.message : "Failed to create territory");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/admin/territories"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Territories
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-brand-navy/10 flex items-center justify-center">
          <MapPinIcon className="h-5 w-5 text-brand-navy" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Add New Territory</h1>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Territory Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Territory Information</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (validationErrors.name) {
                      setValidationErrors({ ...validationErrors, name: "" });
                    }
                  }}
                  placeholder="e.g. Westside Metro"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm ${
                    validationErrors.name ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {validationErrors.name && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.state}
                  onChange={(e) => {
                    setForm({ ...form, state: e.target.value });
                    if (validationErrors.state) {
                      setValidationErrors({ ...validationErrors, state: "" });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm ${
                    validationErrors.state ? "border-red-300" : "border-gray-300"
                  }`}
                >
                  <option value="">Select a state</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {validationErrors.state && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.state}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Brief description of the territory..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Location Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Center Latitude</label>
              <input
                type="number"
                step="any"
                value={form.centerLat}
                onChange={(e) => setForm({ ...form, centerLat: e.target.value })}
                placeholder="e.g. 36.1627"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm ${
                  validationErrors.centerLat ? "border-red-300" : "border-gray-300"
                }`}
              />
              {validationErrors.centerLat && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.centerLat}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Center Longitude</label>
              <input
                type="number"
                step="any"
                value={form.centerLng}
                onChange={(e) => setForm({ ...form, centerLng: e.target.value })}
                placeholder="e.g. -86.7816"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm ${
                  validationErrors.centerLng ? "border-red-300" : "border-gray-300"
                }`}
              />
              {validationErrors.centerLng && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.centerLng}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Radius (miles)</label>
              <input
                type="number"
                step="any"
                value={form.radiusMiles}
                onChange={(e) => setForm({ ...form, radiusMiles: e.target.value })}
                placeholder="e.g. 15"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm ${
                  validationErrors.radiusMiles ? "border-red-300" : "border-gray-300"
                }`}
              />
              {validationErrors.radiusMiles && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.radiusMiles}</p>
              )}
            </div>
          </div>

          {/* Map hint */}
          <div className="bg-brand-light rounded-lg p-4 flex items-start gap-3">
            <MapPinIcon className="h-5 w-5 text-brand-navy flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Want to draw a territory on the map?
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Use the{" "}
                <Link
                  href="/admin/territories/map"
                  className="text-brand-navy font-medium hover:underline"
                >
                  Map Canvas
                </Link>{" "}
                to draw boundaries with radius circles, polygons, isochrones, ZIP codes, or admin boundaries.
              </p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <MapPinIcon className="h-4 w-4" />
                Create Territory
              </>
            )}
          </button>
          <Link
            href="/admin/territories"
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
