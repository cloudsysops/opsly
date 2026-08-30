"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  PaperClipIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  LinkIcon,
  PlusIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

interface LinkedResource {
  id: string;
  moduleId: string;
  resourceType: string;
  resourceId: string;
  sortOrder: number;
  label: string | null;
  resolvedTitle: string;
  resolvedUrl: string | null;
  resolvedCategory: string | null;
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  category: string | null;
  description: string | null;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  ACADEMY_RESOURCE: { label: "Resource", color: "bg-blue-100 text-blue-700" },
  KNOWLEDGE_DOCUMENT: { label: "Article", color: "bg-green-100 text-green-700" },
  CREATIVE_ASSET: { label: "Asset", color: "bg-purple-100 text-purple-700" },
  MANUAL_PAGE: { label: "Manual", color: "bg-amber-100 text-amber-700" },
  EXTERNAL_URL: { label: "Link", color: "bg-gray-100 text-gray-700" },
};

export default function ModuleResourceLinker({ moduleId }: { moduleId: string }) {
  const [resources, setResources] = useState<LinkedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUrlForm, setShowUrlForm] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlLabel, setUrlLabel] = useState("");
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/learning/modules/${moduleId}/resources`);
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources);
      }
    } catch (err) {
      console.error("Failed to fetch linked resources:", err);
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  // Click outside to close search
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/learning/resources/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const linkResource = async (type: string, id: string) => {
    try {
      const res = await fetch(`/api/admin/learning/modules/${moduleId}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: type,
          resourceId: id,
          sortOrder: resources.length,
        }),
      });
      if (res.ok) {
        await fetchResources();
        setSearchQuery("");
        setSearchResults([]);
        setShowSearch(false);
      }
    } catch (err) {
      console.error("Failed to link resource:", err);
    }
  };

  const unlinkResource = async (id: string) => {
    try {
      await fetch(`/api/admin/learning/module-resources/${id}`, { method: "DELETE" });
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to unlink resource:", err);
    }
  };

  const moveResource = async (id: string, direction: "up" | "down") => {
    const index = resources.findIndex((r) => r.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === resources.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newResources = [...resources];
    [newResources[index], newResources[newIndex]] = [newResources[newIndex], newResources[index]];

    // Update sort orders
    setResources(newResources);
    try {
      await Promise.all(
        newResources.map((r, i) =>
          fetch(`/api/admin/learning/module-resources/${r.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: i }),
          })
        )
      );
    } catch (err) {
      console.error("Failed to reorder:", err);
      fetchResources(); // Reset on error
    }
  };

  const addExternalUrl = async () => {
    if (!urlInput.trim()) return;
    await linkResource("EXTERNAL_URL", urlInput.trim());
    setUrlInput("");
    setUrlLabel("");
    setShowUrlForm(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/admin/resources/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        console.error("Upload failed:", err.error);
        return;
      }
      const { url, filename } = await uploadRes.json();
      // Link as external URL with the S3 URL — use filename as label
      const res = await fetch(`/api/admin/learning/modules/${moduleId}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: "EXTERNAL_URL",
          resourceId: url,
          label: filename,
          sortOrder: resources.length,
        }),
      });
      if (res.ok) {
        await fetchResources();
      }
    } catch (err) {
      console.error("File upload failed:", err);
    } finally {
      setFileUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="animate-pulse h-4 bg-gray-200 rounded w-1/3" />
      </div>
    );
  }

  return (
    <section className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <PaperClipIcon className="h-4 w-4" />
          Additional Resources ({resources.length})
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={fileUploading}
            className="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center gap-1 disabled:opacity-50"
          >
            <ArrowUpTrayIcon className="h-3 w-3" />
            {fileUploading ? "Uploading..." : "Upload File"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.csv"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => setShowUrlForm(!showUrlForm)}
            className="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center gap-1"
          >
            <LinkIcon className="h-3 w-3" />
            Add URL
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="text-xs px-2.5 py-1 rounded-md bg-brand-navy text-white hover:bg-brand-purple flex items-center gap-1"
          >
            <PlusIcon className="h-3 w-3" />
            Link Resource
          </button>
        </div>
      </div>

      {/* External URL form */}
      {showUrlForm && (
        <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200 space-y-2">
          <input
            type="url"
            placeholder="https://..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy"
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={urlLabel}
            onChange={(e) => setUrlLabel(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy"
          />
          <div className="flex gap-2">
            <button
              onClick={addExternalUrl}
              disabled={!urlInput.trim()}
              className="text-xs px-3 py-1.5 bg-brand-navy text-white rounded-md hover:bg-brand-purple disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => { setShowUrlForm(false); setUrlInput(""); setUrlLabel(""); }}
              className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search dropdown */}
      {showSearch && (
        <div ref={searchRef} className="relative mb-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy"
            />
          </div>
          {(searchResults.length > 0 || searching) && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
              {searching ? (
                <div className="p-3 text-sm text-gray-500">Searching...</div>
              ) : (
                searchResults.map((result) => {
                  const typeInfo = TYPE_LABELS[result.type] || { label: result.type, color: "bg-gray-100 text-gray-600" };
                  const alreadyLinked = resources.some(
                    (r) => r.resourceType === result.type && r.resourceId === result.id
                  );
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => !alreadyLinked && linkResource(result.type, result.id)}
                      disabled={alreadyLinked}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                        alreadyLinked ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className="flex-1 truncate">{result.title}</span>
                      {alreadyLinked && <span className="text-[10px] text-gray-400">Linked</span>}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Linked resources list */}
      {resources.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">No additional resources. Add PDFs, links, wiki articles, or SOPs.</p>
      ) : (
        <div className="space-y-1.5">
          {resources.map((resource, index) => {
            const typeInfo = TYPE_LABELS[resource.resourceType] || { label: resource.resourceType, color: "bg-gray-100 text-gray-600" };
            return (
              <div
                key={resource.id}
                className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveResource(resource.id, "up")}
                    disabled={index === 0}
                    className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronUpIcon className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => moveResource(resource.id, "down")}
                    disabled={index === resources.length - 1}
                    className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronDownIcon className="h-3 w-3" />
                  </button>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
                <span className="text-sm text-gray-900 flex-1 truncate">
                  {resource.resolvedTitle}
                </span>
                <button
                  onClick={() => unlinkResource(resource.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
