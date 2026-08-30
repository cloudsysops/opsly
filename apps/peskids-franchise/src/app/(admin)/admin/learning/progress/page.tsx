"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

interface TodoCount {
  pending: number;
  completed: number;
  skipped: number;
}

export default function AdminAcademyProgressPage() {
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [totalModules, setTotalModules] = useState(0);
  const [todoCounts, setTodoCounts] = useState<TodoCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchData() {
      try {
        const [franchiseesRes, todosRes] = await Promise.all([
          fetch("/api/admin/bootcamp/franchisees"),
          fetch("/api/admin/learning/todos"),
        ]);

        if (franchiseesRes.ok) {
          const data = await franchiseesRes.json();
          setFranchisees(data.franchisees);
          setTotalModules(data.totalModules);
        }

        if (todosRes.ok) {
          const data = await todosRes.json();
          setTodoCounts(data.counts);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredFranchisees =
    filter === "all"
      ? franchisees
      : franchisees.filter((f) => f.status === filter);

  const statusColors: Record<string, string> = {
    not_started: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
  };

  const statusLabels: Record<string, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
  };

  // Calculate stats
  const stats = {
    total: franchisees.length,
    notStarted: franchisees.filter((f) => f.status === "not_started").length,
    inProgress: franchisees.filter((f) => f.status === "in_progress").length,
    completed: franchisees.filter((f) => f.status === "completed").length,
    avgCompletion:
      franchisees.length > 0
        ? Math.round(
            franchisees.reduce((sum, f) => sum + f.percentage, 0) /
              franchisees.length
          )
        : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-navy" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">
            Franchisee Progress
          </h1>
          <p className="text-gray-600">
            Monitor franchisee academy progress
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/learning/todos"
            className="px-4 py-2 bg-brand-purple text-white rounded-lg hover:bg-brand-navy transition flex items-center gap-2"
          >
            <span>My To-Dos</span>
            {todoCounts && todoCounts.pending > 0 && (
              <span className="bg-white text-brand-purple px-2 py-0.5 rounded-full text-sm font-bold">
                {todoCounts.pending}
              </span>
            )}
          </Link>
          <Link
            href="/admin/learning/program-builder"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Edit Content
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Total Franchisees</p>
          <p className="text-2xl font-bold text-brand-navy">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Not Started</p>
          <p className="text-2xl font-bold text-gray-600">{stats.notStarted}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Avg Completion</p>
          <p className="text-2xl font-bold text-brand-purple">
            {stats.avgCompletion}%
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {["all", "not_started", "in_progress", "completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f
                ? "bg-brand-navy text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "All" : statusLabels[f]}
          </button>
        ))}
      </div>

      {/* Franchisee Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">
                Franchisee
              </th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">
                Current Phase
              </th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">
                Progress
              </th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">
                Badges
              </th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">
                Status
              </th>
              <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredFranchisees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No franchisees found
                </td>
              </tr>
            ) : (
              filteredFranchisees.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-brand-navy">{f.name}</p>
                      <p className="text-sm text-gray-500">{f.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {f.currentPhase}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            f.percentage >= 100
                              ? "bg-green-500"
                              : "bg-brand-cyan"
                          }`}
                          style={{
                            width: `${Math.min(f.percentage, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {f.percentage}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {f.completedModules}/{f.totalModules} modules
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm">{f.badgesEarned}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[f.status]}`}
                    >
                      {statusLabels[f.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/franchisees/${f.id}`}
                      className="text-brand-purple hover:underline text-sm"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
