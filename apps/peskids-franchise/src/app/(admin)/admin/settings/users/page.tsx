"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
}

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [removeTarget, setRemoveTarget] = useState<AdminUser | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      setUsers(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAdding(true);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });

    if (res.ok) {
      setEmail("");
      setShowAddForm(false);
      fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add admin");
    }
    setAdding(false);
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);

    const res = await fetch(`/api/admin/users/${removeTarget.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setRemoveTarget(null);
      fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to remove admin");
    }
    setRemoving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Users & Roles</h1>
        <p className="mt-1 text-gray-600">
          Manage admin users and their access permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-navy">
              Admin Users
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {users.length} user{users.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setError("");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-navy rounded-lg hover:bg-brand-navy/90 transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Add Admin
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <form onSubmit={handleAdd} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@acmefranchise.com"
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy outline-none"
                />
                <button
                  type="submit"
                  disabled={adding || !email.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-navy rounded-lg hover:bg-brand-navy/90 disabled:opacity-50 transition-colors"
                >
                  {adding ? "Adding..." : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEmail("");
                    setError("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                The user will have admin access the next time they sign in with Google.
              </p>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : users.length > 0 ? (
            <div className="divide-y">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="py-4 first:pt-0 last:pb-0 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name || "User"}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-navy/10 flex items-center justify-center">
                        <span className="text-brand-navy font-medium">
                          {user.name?.charAt(0) || user.email?.charAt(0) || "?"}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.name || user.email}
                      </p>
                      {user.name && (
                        <p className="text-sm text-gray-500">{user.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-brand-navy/10 text-brand-navy">
                      ADMIN
                    </span>
                    <button
                      onClick={() => setRemoveTarget(user)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove admin access"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No admin users found.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            Access Control
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Any user with an{" "}
            <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">
              @acmefranchise.com
            </code>{" "}
            Google account will automatically receive admin access when they sign in.
          </p>
          <p className="text-sm text-gray-500 mt-3">
            You can also pre-register external email addresses above. They will gain admin
            access after signing in.
          </p>
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={!!removeTarget}
        title="Remove Admin Access"
        message={`Are you sure you want to remove admin access for ${removeTarget?.name || removeTarget?.email}? They will no longer be able to access the admin panel.`}
        confirmLabel={removing ? "Removing..." : "Remove Access"}
        confirmVariant="danger"
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
