"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  MapPinIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  UserIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface Territory {
  id: string;
  name: string;
  state: string;
  status: string;
  description?: string;
  centerLat?: number;
  centerLng?: number;
  radiusMiles?: number;
  population?: number;
  medianIncome?: number;
  householdsWithChildren?: number;
  totalHouseholds?: number;
  schoolCount?: number;
  launchDate?: string;
  assignedAt?: string;
  createdAt: string;
  updatedAt: string;
  franchiseeAccount?: {
    id: string;
    prospect: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      selectedAt?: string;
    };
  } | null;
}

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  RESERVED: "bg-yellow-100 text-yellow-700",
  SOLD: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  COMING_SOON: "bg-purple-100 text-purple-700",
  UNAVAILABLE: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
  ACTIVE: "Active",
  COMING_SOON: "Coming Soon",
  UNAVAILABLE: "Unavailable",
};

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
  "AVAILABLE","RESERVED","SOLD","ACTIVE","COMING_SOON","UNAVAILABLE",
];

function formatNumber(n: number | undefined | null): string {
  if (n == null) return "--";
  return new Intl.NumberFormat("en-US").format(n);
}

function formatCurrency(n: number | undefined | null): string {
  if (n == null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(date: string | undefined | null): string {
  if (!date) return "--";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function TerritoryDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;

  const [territory, setTerritory] = useState<Territory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(searchParams.get("edit") === "true");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    state: "",
    description: "",
    status: "",
    centerLat: "",
    centerLng: "",
    radiusMiles: "",
    population: "",
    medianIncome: "",
    householdsWithChildren: "",
    totalHouseholds: "",
    schoolCount: "",
  });

  const fetchTerritory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/territories/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Territory not found");
        }
        throw new Error("Failed to fetch territory");
      }
      const data = await response.json();
      setTerritory(data.territory);
      populateEditForm(data.territory);
    } catch (err) {
      console.error("Failed to fetch territory:", err);
      setError(err instanceof Error ? err.message : "Failed to load territory");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTerritory();
  }, [fetchTerritory]);

  const populateEditForm = (t: Territory) => {
    setEditForm({
      name: t.name || "",
      state: t.state || "",
      description: t.description || "",
      status: t.status || "AVAILABLE",
      centerLat: t.centerLat != null ? String(t.centerLat) : "",
      centerLng: t.centerLng != null ? String(t.centerLng) : "",
      radiusMiles: t.radiusMiles != null ? String(t.radiusMiles) : "",
      population: t.population != null ? String(t.population) : "",
      medianIncome: t.medianIncome != null ? String(t.medianIncome) : "",
      householdsWithChildren: t.householdsWithChildren != null ? String(t.householdsWithChildren) : "",
      totalHouseholds: t.totalHouseholds != null ? String(t.totalHouseholds) : "",
      schoolCount: t.schoolCount != null ? String(t.schoolCount) : "",
    });
  };

  const handleSave = async () => {
    if (!editForm.name.trim() || !editForm.state.trim()) {
      setSaveError("Name and state are required.");
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      const body: Record<string, unknown> = {
        name: editForm.name.trim(),
        state: editForm.state.trim(),
        description: editForm.description.trim() || null,
        status: editForm.status,
        centerLat: editForm.centerLat ? parseFloat(editForm.centerLat) : null,
        centerLng: editForm.centerLng ? parseFloat(editForm.centerLng) : null,
        radiusMiles: editForm.radiusMiles ? parseFloat(editForm.radiusMiles) : null,
        population: editForm.population ? parseInt(editForm.population, 10) : null,
        medianIncome: editForm.medianIncome ? parseInt(editForm.medianIncome, 10) : null,
        householdsWithChildren: editForm.householdsWithChildren ? parseInt(editForm.householdsWithChildren, 10) : null,
        totalHouseholds: editForm.totalHouseholds ? parseInt(editForm.totalHouseholds, 10) : null,
        schoolCount: editForm.schoolCount ? parseInt(editForm.schoolCount, 10) : null,
      };

      const response = await fetch(`/api/admin/territories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to save");
      }

      const data = await response.json();
      setTerritory(data.territory);
      populateEditForm(data.territory);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save territory:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save territory");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (territory) {
      populateEditForm(territory);
    }
    setSaveError(null);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
      </div>
    );
  }

  if (error || !territory) {
    return (
      <div className="max-w-7xl mx-auto">
        <Link
          href="/admin/territories"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Territories
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error || "Territory not found"}</p>
          <button
            onClick={fetchTerritory}
            className="mt-3 text-sm text-red-600 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back link */}
      <Link
        href="/admin/territories"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Territories
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand-navy/10 flex items-center justify-center">
            <MapPinIcon className="h-5 w-5 text-brand-navy" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{territory.name}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  STATUS_STYLES[territory.status] || STATUS_STYLES.UNAVAILABLE
                }`}
              >
                {STATUS_LABELS[territory.status] || territory.status}
              </span>
            </div>
            <p className="text-gray-500 text-sm">{territory.state}</p>
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            <PencilIcon className="h-4 w-4" />
            Edit Territory
          </button>
        )}
      </div>

      {/* Save Error Banner */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-center justify-between">
          <p className="text-sm text-red-700">{saveError}</p>
          <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-600">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Territory Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Territory Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Territory Details</h2>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editForm.state}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                    >
                      <option value="">Select a state</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Center Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.centerLat}
                      onChange={(e) => setEditForm({ ...editForm, centerLat: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                      placeholder="e.g. 36.1627"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Center Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.centerLng}
                      onChange={(e) => setEditForm({ ...editForm, centerLng: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                      placeholder="e.g. -86.7816"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Radius (miles)</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.radiusMiles}
                      onChange={(e) => setEditForm({ ...editForm, radiusMiles: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                      placeholder="e.g. 15"
                    />
                  </div>
                </div>

                {/* Edit Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <CheckIcon className="h-4 w-4" />
                    )}
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {territory.description && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Description</p>
                    <p className="text-sm text-gray-900">{territory.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Radius</p>
                    <p className="text-sm font-medium text-gray-900">
                      {territory.radiusMiles != null ? `${territory.radiusMiles} miles` : "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Launch Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(territory.launchDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Created</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(territory.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Demographics Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Demographics</h2>

            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Population</label>
                  <input
                    type="number"
                    value={editForm.population}
                    onChange={(e) => setEditForm({ ...editForm, population: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                    placeholder="e.g. 250000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Median Income ($)</label>
                  <input
                    type="number"
                    value={editForm.medianIncome}
                    onChange={(e) => setEditForm({ ...editForm, medianIncome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                    placeholder="e.g. 65000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Households with Children</label>
                  <input
                    type="number"
                    value={editForm.householdsWithChildren}
                    onChange={(e) => setEditForm({ ...editForm, householdsWithChildren: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                    placeholder="e.g. 45000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Households</label>
                  <input
                    type="number"
                    value={editForm.totalHouseholds}
                    onChange={(e) => setEditForm({ ...editForm, totalHouseholds: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                    placeholder="e.g. 120000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schools</label>
                  <input
                    type="number"
                    value={editForm.schoolCount}
                    onChange={(e) => setEditForm({ ...editForm, schoolCount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
                    placeholder="e.g. 75"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Population</p>
                    <p className="text-lg font-semibold text-gray-900">{formatNumber(territory.population)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <BuildingOfficeIcon className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Median Income</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(territory.medianIncome)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Households w/ Children</p>
                    <p className="text-lg font-semibold text-gray-900">{formatNumber(territory.householdsWithChildren)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <BuildingOfficeIcon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Households</p>
                    <p className="text-lg font-semibold text-gray-900">{formatNumber(territory.totalHouseholds)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <AcademicCapIcon className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Schools</p>
                    <p className="text-lg font-semibold text-gray-900">{formatNumber(territory.schoolCount)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Territory Map */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Territory Map</h2>
              <Link
                href="/admin/territories/map"
                className="text-xs font-medium text-brand-navy hover:underline"
              >
                Open in Map Canvas
              </Link>
            </div>
            {territory.centerLat != null && territory.centerLng != null ? (
              <div className="rounded-lg overflow-hidden h-64">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+2D2F8E(${territory.centerLng},${territory.centerLat})/${territory.centerLng},${territory.centerLat},${territory.radiusMiles != null && territory.radiusMiles <= 10 ? 11 : territory.radiusMiles != null && territory.radiusMiles <= 25 ? 9 : 8},0/800x400@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""}`}
                  alt={`Map of ${territory.name}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg h-64 flex flex-col items-center justify-center">
                <GlobeAltIcon className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400 font-medium">No coordinates set</p>
                <p className="text-xs text-gray-400 mt-1">
                  Add coordinates to see a map preview
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Assignment */}
        <div className="space-y-6">
          {/* Assignment Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h2>

            {territory.franchiseeAccount ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple font-medium text-sm flex-shrink-0">
                    {territory.franchiseeAccount.prospect.firstName[0]}
                    {territory.franchiseeAccount.prospect.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {territory.franchiseeAccount.prospect.firstName}{" "}
                      {territory.franchiseeAccount.prospect.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {territory.franchiseeAccount.prospect.email}
                    </p>
                  </div>
                </div>

                {territory.franchiseeAccount.prospect.phone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">
                      {territory.franchiseeAccount.prospect.phone}
                    </p>
                  </div>
                )}

                {territory.assignedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Assigned</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(territory.assignedAt)}
                    </p>
                  </div>
                )}

                <Link
                  href={`/admin/franchisees/${territory.franchiseeAccount.prospect.id}`}
                  className="inline-flex items-center gap-1 text-sm text-brand-navy hover:underline mt-2"
                >
                  View Franchisee Profile
                  <ArrowLeftIcon className="h-3 w-3 rotate-180" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <UserIcon className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-1">No franchisee assigned</p>
                <p className="text-xs text-gray-400">
                  Assign this territory from a franchisee&apos;s profile page.
                </p>
              </div>
            )}
          </div>

          {/* Quick Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_STYLES[territory.status] || STATUS_STYLES.UNAVAILABLE
                  }`}
                >
                  {STATUS_LABELS[territory.status] || territory.status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">State</span>
                <span className="font-medium text-gray-900">{territory.state}</span>
              </div>
              {territory.radiusMiles != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Radius</span>
                  <span className="font-medium text-gray-900">{territory.radiusMiles} miles</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Created</span>
                <span className="font-medium text-gray-900">{formatDate(territory.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Last Updated</span>
                <span className="font-medium text-gray-900">{formatDate(territory.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
