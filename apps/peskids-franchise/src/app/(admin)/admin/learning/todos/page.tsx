"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Todo {
  id: string;
  actionText: string;
  status: "PENDING" | "COMPLETED" | "SKIPPED";
  createdAt: string;
  sentEmailAt: string | null;
  prospect: {
    id: string;
    name: string;
    email: string;
  };
  task: {
    id: string;
    slug: string;
    title: string;
    targetDay: number | null;
    verificationType: string;
    phaseName: string;
    weekName: string;
  };
  urgency: {
    daysUntilDue: number;
    isOverdue: boolean;
    currentDay: number;
    priority: "urgent" | "high" | "normal";
  };
}

interface Counts {
  pending: number;
  completed: number;
  skipped: number;
}

export default function AdminJourneyTodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"PENDING" | "COMPLETED" | "SKIPPED">(
    "PENDING"
  );
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    fetchTodos();
  }, [filter]);

  async function fetchTodos() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bootcamp/todos?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setTodos(data.todos);
        setCounts(data.counts);
      }
    } catch (err) {
      console.error("Failed to fetch todos:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(todoId: string, status: "COMPLETED" | "SKIPPED") {
    setCompleting(todoId);
    try {
      const res = await fetch(`/api/admin/bootcamp/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        // Remove from list and refresh counts
        setTodos((prev) => prev.filter((t) => t.id !== todoId));
        fetchTodos();
      }
    } catch (err) {
      console.error("Failed to update todo:", err);
    } finally {
      setCompleting(null);
    }
  }

  const priorityColors = {
    urgent: "border-red-500 bg-red-50",
    high: "border-orange-400 bg-orange-50",
    normal: "border-gray-200 bg-white",
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Franchisor To-Dos</h1>
          <p className="text-gray-600">
            Tasks that need your action for franchisees
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/learning/progress"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            View Progress
          </Link>
          <Link
            href="/admin/learning/program-builder"
            className="text-brand-purple hover:underline flex items-center"
          >
            Edit Content →
          </Link>
        </div>
      </div>

      {/* Stats */}
      {counts && (
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setFilter("PENDING")}
            className={`flex-1 p-4 rounded-xl border-2 transition ${
              filter === "PENDING"
                ? "border-brand-purple bg-purple-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-3xl font-bold text-brand-purple">
              {counts.pending}
            </p>
            <p className="text-sm text-gray-600">Pending</p>
          </button>
          <button
            onClick={() => setFilter("COMPLETED")}
            className={`flex-1 p-4 rounded-xl border-2 transition ${
              filter === "COMPLETED"
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-3xl font-bold text-green-600">
              {counts.completed}
            </p>
            <p className="text-sm text-gray-600">Completed</p>
          </button>
          <button
            onClick={() => setFilter("SKIPPED")}
            className={`flex-1 p-4 rounded-xl border-2 transition ${
              filter === "SKIPPED"
                ? "border-gray-500 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-3xl font-bold text-gray-600">{counts.skipped}</p>
            <p className="text-sm text-gray-600">Skipped</p>
          </button>
        </div>
      )}

      {/* Todo List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-navy" />
        </div>
      ) : todos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <p className="text-gray-500">
            {filter === "PENDING"
              ? "No pending tasks - you're all caught up! 🎉"
              : `No ${filter.toLowerCase()} tasks`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className={`rounded-xl border-2 p-5 ${priorityColors[todo.urgency.priority]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Urgency Badge */}
                  {filter === "PENDING" && (
                    <div className="mb-2">
                      {todo.urgency.isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-sm text-red-600 font-medium">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          {Math.abs(todo.urgency.daysUntilDue)} day
                          {Math.abs(todo.urgency.daysUntilDue) > 1 ? "s" : ""}{" "}
                          overdue
                        </span>
                      ) : todo.urgency.daysUntilDue === 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm text-orange-600 font-medium">
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                          Due today
                        </span>
                      ) : todo.urgency.daysUntilDue <= 3 ? (
                        <span className="inline-flex items-center gap-1 text-sm text-orange-500">
                          <span className="w-2 h-2 rounded-full bg-orange-400" />
                          Due in {todo.urgency.daysUntilDue} day
                          {todo.urgency.daysUntilDue > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {/* Action Text */}
                  <h3 className="font-semibold text-lg text-brand-navy">
                    {todo.actionText}
                  </h3>

                  {/* Task Info */}
                  <p className="text-sm text-gray-600 mt-1">
                    {todo.task.phaseName} → {todo.task.weekName}
                  </p>

                  {/* Franchisee Info */}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center text-sm font-medium">
                      {todo.prospect.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{todo.prospect.name}</p>
                      <p className="text-xs text-gray-500">
                        {todo.prospect.email}
                      </p>
                    </div>
                    {todo.sentEmailAt && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200 ml-auto">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        Email Sent {new Date(todo.sentEmailAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {filter === "PENDING" && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleComplete(todo.id, "COMPLETED")}
                      disabled={completing === todo.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {completing === todo.id ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <span>✓</span>
                      )}
                      Complete
                    </button>
                    <button
                      onClick={() => handleComplete(todo.id, "SKIPPED")}
                      disabled={completing === todo.id}
                      className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                    >
                      Skip
                    </button>
                    <Link
                      href={`/admin/prospects/${todo.prospect.id}`}
                      className="px-4 py-2 text-center text-sm text-brand-purple hover:underline"
                    >
                      View Prospect
                    </Link>
                  </div>
                )}

                {filter !== "PENDING" && (
                  <div className="text-sm text-gray-500">
                    <p>
                      {filter === "COMPLETED" ? "Completed" : "Skipped"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
