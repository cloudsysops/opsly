"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon,
  FireIcon,
} from "@heroicons/react/24/outline";

interface Franchisee {
  id: string;
  name: string;
  email: string;
  completedModules: number;
  totalModules: number;
  percentage: number;
  currentPhase: string;
  lastActivity: string | null;
  status: "not_started" | "in_progress" | "completed";
  badgesEarned: number;
  hasRecentActivity: boolean;
}

interface FranchiseeDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  territory: string | null;
  joinedAt: string;
  stats: {
    completedModules: number;
    totalModules: number;
    overallPercentage: number;
    totalPoints: number;
    totalTimeSpent: number;
    currentStreak: number;
    badgesEarned: number;
  };
  phases: {
    id: string;
    title: string;
    description: string | null;
    duration: string | null;
    order: number;
    modules: {
      id: string;
      title: string;
      type: string;
      points: number;
      duration: number;
      status: string;
      score: number | null;
      completedAt: string | null;
      timeSpent: number | null;
    }[];
    completedModules: number;
    totalModules: number;
    percentage: number;
  }[];
  badges: {
    id: string;
    title: string;
    description: string;
    imageUrl: string | null;
    earnedAt: string;
  }[];
}

export default function FranchiseesProgressPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [totalModules, setTotalModules] = useState(0);

  const [selectedFranchisee, setSelectedFranchisee] = useState<FranchiseeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchFranchisees = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter) params.set("filter", filter);
      if (sort) params.set("sort", sort);

      const res = await fetch(`/api/admin/learning/franchisees?${params}`);
      const data = await res.json();
      setFranchisees(data.franchisees || []);
      setTotalModules(data.totalModules || 0);
    } catch (error) {
      console.error("Failed to fetch franchisees:", error);
    } finally {
      setLoading(false);
    }
  }, [search, filter, sort]);

  useEffect(() => {
    fetchFranchisees();
  }, [fetchFranchisees]);

  // Fetch detail when ID is in URL
  useEffect(() => {
    if (selectedId) {
      fetchDetail(selectedId);
    } else {
      setSelectedFranchisee(null);
    }
  }, [selectedId]);

  const fetchDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/admin/learning/franchisees/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedFranchisee(data);
      }
    } catch (error) {
      console.error("Failed to fetch franchisee detail:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = (id: string) => {
    router.push(`/admin/learning/franchisees?id=${id}`);
  };

  const closeDetail = () => {
    router.push("/admin/learning/franchisees");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-3 w-3" />
            Completed
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <ClockIcon className="h-3 w-3" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Not Started
          </span>
        );
    }
  };

  const formatTimeSpent = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">
          Franchisee Progress
        </h1>
        <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-600">
          Track and monitor franchisee training completion
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent bg-white"
              >
                <option value="all">All Status</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="not_started">Not Started</option>
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent bg-white"
              >
                <option value="name">Sort by Name</option>
                <option value="progress">Sort by Progress</option>
                <option value="last_activity">Sort by Activity</option>
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
            </div>
          ) : franchisees.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No franchisees found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Franchisee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Current Phase
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Modules
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Last Activity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {franchisees.map((franchisee) => (
                    <tr
                      key={franchisee.id}
                      onClick={() => openDetail(franchisee.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {franchisee.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {franchisee.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-[100px] max-w-[150px]">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-green rounded-full transition-all"
                                style={{ width: `${franchisee.percentage}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 min-w-[40px]">
                            {franchisee.percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-sm text-gray-700">
                          {franchisee.currentPhase}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-sm text-gray-700">
                          {franchisee.completedModules}/{franchisee.totalModules}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          {franchisee.hasRecentActivity && (
                            <FireIcon className="h-4 w-4 text-orange-500" />
                          )}
                          <span className="text-sm text-gray-500">
                            {franchisee.lastActivity
                              ? new Date(franchisee.lastActivity).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" }
                                )
                              : "Never"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(franchisee.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-brand-navy">
                {detailLoading ? "Loading..." : selectedFranchisee?.name}
              </h2>
              <button
                onClick={closeDetail}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
              </div>
            ) : selectedFranchisee ? (
              <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-brand-navy">
                      {selectedFranchisee.stats.overallPercentage}%
                    </div>
                    <div className="text-xs text-gray-500">Overall Progress</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-brand-green">
                      {selectedFranchisee.stats.totalPoints}
                    </div>
                    <div className="text-xs text-gray-500">Points Earned</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-brand-purple">
                      {selectedFranchisee.stats.currentStreak}
                    </div>
                    <div className="text-xs text-gray-500">Day Streak</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-brand-cyan">
                      {selectedFranchisee.stats.badgesEarned}
                    </div>
                    <div className="text-xs text-gray-500">Badges Earned</div>
                  </div>
                </div>

                {/* Progress by Phase */}
                <h3 className="text-lg font-semibold text-brand-navy mb-4">
                  Progress by Phase
                </h3>
                <div className="space-y-4 mb-6">
                  {selectedFranchisee.phases.map((phase) => (
                    <div key={phase.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {phase.title}
                          </h4>
                          <p className="text-xs text-gray-500">{phase.duration}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-brand-navy">
                            {phase.percentage}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {phase.completedModules}/{phase.totalModules} modules
                          </div>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-brand-green rounded-full transition-all"
                          style={{ width: `${phase.percentage}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {phase.modules.map((module) => (
                          <div
                            key={module.id}
                            className={`flex items-center gap-2 p-2 rounded text-sm ${
                              module.status === "COMPLETED"
                                ? "bg-green-50"
                                : module.status === "IN_PROGRESS"
                                ? "bg-blue-50"
                                : "bg-gray-50"
                            }`}
                          >
                            {module.status === "COMPLETED" ? (
                              <CheckCircleIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : module.status === "IN_PROGRESS" ? (
                              <ClockIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                            )}
                            <span className="truncate">{module.title}</span>
                            {module.score !== null && (
                              <span className="ml-auto text-xs text-gray-500">
                                {module.score}%
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Badges */}
                {selectedFranchisee.badges.length > 0 && (
                  <>
                    <h3 className="text-lg font-semibold text-brand-navy mb-4">
                      Badges Earned
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {selectedFranchisee.badges.map((badge) => (
                        <div
                          key={badge.id}
                          className="flex flex-col items-center p-3 bg-yellow-50 rounded-lg"
                        >
                          <TrophyIcon className="h-8 w-8 text-yellow-600 mb-2" />
                          <div className="text-sm font-medium text-center">
                            {badge.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(badge.earnedAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                Franchisee not found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
