"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import AcademyLayout from "@/components/academy/AcademyLayout";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import {
  DocumentTextIcon,
  FolderIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

interface Resource {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  fileUrl: string | null;
  externalUrl: string | null;
  content: string | null;
}

const categoryLabels: Record<string, string> = {
  OPERATIONS: "Operations",
  MARKETING: "Marketing",
  SALES: "Sales",
  TRAINING: "Training",
  LEGAL: "Legal",
  FINANCIAL: "Financial",
  TEMPLATES: "Templates",
};

const categoryColors: Record<string, string> = {
  OPERATIONS: "bg-blue-100 text-blue-700 border-blue-200",
  MARKETING: "bg-purple-100 text-purple-700 border-purple-200",
  SALES: "bg-green-100 text-green-700 border-green-200",
  TRAINING: "bg-orange-100 text-orange-700 border-orange-200",
  LEGAL: "bg-slate-100 text-slate-700 border-slate-200",
  FINANCIAL: "bg-emerald-100 text-emerald-700 border-emerald-200",
  TEMPLATES: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

export default function ResourcesPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedResource, setExpandedResource] = useState<string | null>(null);
  const [stats, setStats] = useState({ points: 0, badges: 0, streak: 0 });

  useEffect(() => {
    fetchResources();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/bootcamp/progress");
      if (response.ok) {
        const data = await response.json();
        setStats({
          points: data.total_points || 0,
          badges: data.badges_earned || 0,
          streak: data.current_streak_days || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchResources = async () => {
    try {
      const response = await fetch("/api/bootcamp/resources");
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = resources.filter((resource) => {
    const matchesCategory =
      !selectedCategory || resource.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <AcademyLayout progress={0} stats={stats} user={session?.user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-navy/20 border-t-brand-navy" />
            <p className="text-slate-500 font-medium">Loading Resources...</p>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  return (
    <AcademyLayout progress={0} stats={stats} user={session?.user}>
      <WideContainer className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Resource Library</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Access SOPs, templates, and training materials
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy outline-none"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  !selectedCategory
                    ? "bg-brand-navy text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All
              </button>
              {(categories || []).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? "bg-brand-navy text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {categoryLabels[category] || category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <div className="text-center py-8 sm:py-12 bg-white rounded-xl border border-slate-200">
            <FolderIcon className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300 mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-slate-500">No resources found</p>
            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory(null);
                }}
                className="text-brand-navy hover:underline text-xs sm:text-sm mt-2"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource) => (
              <div
                key={resource.id}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-brand-navy/30 transition-all"
              >
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="p-1.5 sm:p-2 bg-slate-100 rounded-lg">
                    <DocumentTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
                  </div>
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${categoryColors[resource.category] || "bg-slate-100 text-slate-600"}`}
                  >
                    {categoryLabels[resource.category] || resource.category}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">
                  {resource.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4 line-clamp-2">
                  {resource.description}
                </p>

                <div className="flex gap-2">
                  {resource.content && (
                    <button
                      onClick={() =>
                        setExpandedResource(
                          expandedResource === resource.id ? null : resource.id
                        )
                      }
                      className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-100 text-slate-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-slate-200 transition-colors"
                    >
                      {expandedResource === resource.id ? "Hide" : "View"}
                    </button>
                  )}
                  {resource.fileUrl && (
                    <a
                      href={resource.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-brand-navy text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#3a3c9e] transition-colors"
                    >
                      Download
                      <ArrowTopRightOnSquareIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                    </a>
                  )}
                  {resource.externalUrl && !resource.fileUrl && (
                    <a
                      href={resource.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-brand-navy text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#3a3c9e] transition-colors"
                    >
                      Open
                      <ArrowTopRightOnSquareIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                    </a>
                  )}
                </div>

                {/* Expanded Content */}
                {expandedResource === resource.id && resource.content && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200">
                    <p className="text-xs sm:text-sm text-slate-600">{resource.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </WideContainer>
    </AcademyLayout>
  );
}
