"use client";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import ShareDialog from "@/components/territories/ShareDialog";
import { MapIcon, ShareIcon, TrashIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

export const dynamic = "force-dynamic";

interface SharedMap {
  id: string;
  name: string;
  shareToken: string | null;
  shareExpiry: string | null;
  isShared: boolean;
  createdAt: string;
  createdBy: string;
}

export default function MapsPage() {
  const [maps, setMaps] = useState<SharedMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchMaps();
  }, []);

  const fetchMaps = async () => {
    try {
      // For now just show the page structure - maps are created via the share API
      setMaps([]);
    } catch (err) {
      console.error("Failed to fetch maps:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyShareLink = (token: string) => {
    const baseUrl = window.location.origin;
    navigator.clipboard.writeText(`${baseUrl}/share/${token}`);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
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
          <h1 className="text-2xl font-bold text-gray-900">Shared Maps</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage shareable territory map links
          </p>
        </div>
        <button
          onClick={() => setShowShareDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors"
        >
          <ShareIcon className="h-4 w-4" />
          Create Share Link
        </button>
      </div>

      {/* Maps Grid */}
      {maps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {maps.map((map) => (
            <div
              key={map.id}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{map.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Created {new Date(map.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    map.isShared
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {map.isShared ? "Active" : "Private"}
                </span>
              </div>

              {map.shareExpiry && (
                <p className="text-xs text-gray-500 mb-3">
                  Expires: {new Date(map.shareExpiry).toLocaleDateString()}
                </p>
              )}

              <div className="flex items-center gap-2">
                {map.shareToken && (
                  <button
                    onClick={() => copyShareLink(map.shareToken as string)}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    <ClipboardDocumentIcon className="h-3 w-3" />
                    {copiedId === map.shareToken ? "Copied" : "Copy Link"}
                  </button>
                )}
                <button
                  onClick={() => setDeleteId(map.id)}
                  className="text-xs px-2 py-1 text-red-500 hover:text-red-700 transition-colors"
                >
                  <TrashIcon className="h-3 w-3 inline" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <MapIcon className="h-12 w-12 mx-auto mb-3" />
          <p className="text-lg font-medium">No Shared Maps</p>
          <p className="text-sm mt-1">
            Create a share link from the territory map to generate shareable views
          </p>
        </div>
      )}

      {showShareDialog && (
        <ShareDialog
          isOpen={true}
          onClose={() => {
            setShowShareDialog(false);
            fetchMaps();
          }}
        />
      )}

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Shared Map"
        message="This will permanently deactivate the share link. Anyone with the link will no longer be able to view it."
        confirmLabel="Delete"
        onConfirm={() => {
          setDeleteId(null);
          fetchMaps();
        }}
        onCancel={() => setDeleteId(null)}
      />
    </WideContainer>
  );
}
