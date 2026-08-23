"use client";

import { useState } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  PhotoIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useCanvaDesigns, useCanvaConnection } from "@/hooks/useCanva";
import type { CanvaDesign } from "@/lib/canva";

interface CanvaDesignWithEmbed extends CanvaDesign {
  embedUrl: string;
}

interface CanvaDesignPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (design: CanvaDesignWithEmbed) => void;
  selectedId?: string;
}

export function CanvaDesignPicker({
  isOpen,
  onClose,
  onSelect,
  selectedId,
}: CanvaDesignPickerProps) {
  const { status: connectionStatus, isLoading: connectionLoading } =
    useCanvaConnection();

  const {
    designs,
    isLoading,
    error,
    query,
    setQuery,
    hasMore,
    loadMore,
    refresh,
  } = useCanvaDesigns();

  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadMore();
    setLoadingMore(false);
  };

  if (!isOpen) return null;

  if (!connectionLoading && !connectionStatus?.connected) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Connect Canva
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center py-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PhotoIcon className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Canva Not Connected
            </h3>
            <p className="text-gray-600 mb-6">
              Connect your Canva account to browse and embed designs.
            </p>
            <a
              href="/api/auth/canva"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Connect Canva
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Select from Canva
            </h2>
            {connectionStatus?.displayName && (
              <p className="text-sm text-gray-500">
                Connected as {connectionStatus.displayName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Refresh"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search designs..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && designs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <PhotoIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">{error.message}</p>
              {error.message.includes("not connected") && (
                <a
                  href="/api/auth/canva"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Connect Canva
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </a>
              )}
            </div>
          ) : designs.length === 0 ? (
            <div className="text-center py-12">
              <PhotoIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">
                {query ? "No designs match your search" : "No designs found"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {designs.map((design) => (
                  <button
                    key={design.id}
                    onClick={() => onSelect(design)}
                    className={`text-left rounded-lg overflow-hidden border-2 transition-all hover:shadow-md ${
                      selectedId === design.id
                        ? "border-purple-500 ring-2 ring-purple-200"
                        : "border-gray-200 hover:border-purple-300"
                    }`}
                  >
                    <div className="relative aspect-[4/3] bg-gray-100">
                      {design.thumbnail?.url ? (
                        <img
                          src={design.thumbnail.url}
                          alt={design.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PhotoIcon className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                      {design.page_count && design.page_count > 1 && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/75 text-white text-xs rounded">
                          {design.page_count} pages
                        </div>
                      )}
                      {selectedId === design.id && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <CheckIcon className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-gray-900 text-sm line-clamp-2">
                        {design.title || "Untitled"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(design.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-purple-600 hover:text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50 disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
