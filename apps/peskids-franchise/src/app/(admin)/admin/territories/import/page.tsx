"use client";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import DatasetImportWizard from "@/components/territories/DatasetImportWizard";
import { PlusIcon, TrashIcon, ArrowPathIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

export const dynamic = "force-dynamic";

interface Dataset {
  id: string;
  name: string;
  sourceType: string;
  rowCount: number;
  geocodedCount: number;
  createdAt: string;
  _count?: { dataPoints: number };
}

export default function ImportPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState<string | null>(null);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      const res = await fetch("/api/admin/territories/datasets");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDatasets(data);
    } catch (err) {
      console.error("Failed to fetch datasets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/territories/datasets/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setDeleteId(null);
      await fetchDatasets();
    } catch (err) {
      console.error("Failed to delete dataset:", err);
    }
  };

  const handleGeocode = async (id: string) => {
    setGeocoding(id);
    try {
      const res = await fetch(`/api/admin/territories/datasets/${id}/geocode`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to geocode");
      await fetchDatasets();
    } catch (err) {
      console.error("Geocoding failed:", err);
    } finally {
      setGeocoding(null);
    }
  };

  const handleImportComplete = () => {
    setShowWizard(false);
    fetchDatasets();
  };

  if (isLoading) {
    return (
      <WideContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        </div>
      </WideContainer>
    );
  }

  return (
    <WideContainer>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
          <p className="text-sm text-gray-500 mt-1">
            Import custom datasets and overlay them on territory maps
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Import Dataset
        </button>
      </div>

      {showWizard && (
        <div className="mb-6">
          <DatasetImportWizard
            onComplete={handleImportComplete}
            onCancel={() => setShowWizard(false)}
          />
        </div>
      )}

      {/* Datasets Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rows
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Geocoded
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {datasets.map((ds) => (
              <tr key={ds.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {ds.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{ds.sourceType}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {ds.rowCount.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`${
                      ds.geocodedCount === ds.rowCount
                        ? "text-green-600"
                        : "text-amber-600"
                    }`}
                  >
                    {ds.geocodedCount}/{ds.rowCount}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(ds.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  {ds.geocodedCount < ds.rowCount && (
                    <button
                      onClick={() => handleGeocode(ds.id)}
                      disabled={geocoding === ds.id}
                      className="text-brand-navy hover:text-brand-purple transition-colors disabled:opacity-50"
                      title="Geocode addresses"
                    >
                      <ArrowPathIcon
                        className={`h-4 w-4 inline ${geocoding === ds.id ? "animate-spin" : ""}`}
                      />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteId(ds.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title="Delete dataset"
                  >
                    <TrashIcon className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
            {datasets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  <TableCellsIcon className="h-8 w-8 mx-auto mb-2" />
                  <p>No datasets imported yet</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Dataset"
        message="Are you sure you want to delete this dataset? All data points will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </WideContainer>
  );
}
