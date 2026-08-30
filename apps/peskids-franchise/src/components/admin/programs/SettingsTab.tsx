"use client";

import { useState, useEffect, useCallback } from "react";

interface ModuleSettings {
  id: string;
  title: string;
  order: number;
  owner: string | null;
  verificationType: string | null;
  targetDay: number | null;
  isMilestone: boolean;
  notifyFranchisor: boolean;
  franchisorActionText: string | null;
}

interface PhaseGroup {
  id: string;
  title: string;
  order: number;
  modules: ModuleSettings[];
}

interface SettingsTabProps {
  programId: string;
}

export default function SettingsTab({ programId }: SettingsTabProps) {
  const [phases, setPhases] = useState<PhaseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/bootcamp/programs/${programId}/tree`);
      if (!res.ok) return;
      const data = await res.json();
      const tree = data.program?.academyPhases || [];
      setPhases(
        tree.map((p: { id: string; title: string; order: number; modules: ModuleSettings[] }) => ({
          id: p.id,
          title: p.title,
          order: p.order,
          modules: (p.modules || []).map((m: ModuleSettings) => ({
            id: m.id,
            title: m.title,
            order: m.order,
            owner: m.owner,
            verificationType: m.verificationType,
            targetDay: m.targetDay,
            isMilestone: m.isMilestone,
            notifyFranchisor: m.notifyFranchisor,
            franchisorActionText: m.franchisorActionText,
          })),
        }))
      );
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateModule = async (moduleId: string, field: string, value: unknown) => {
    // Update local state immediately
    setPhases((prev) =>
      prev.map((phase) => ({
        ...phase,
        modules: phase.modules.map((m) =>
          m.id === moduleId ? { ...m, [field]: value } : m
        ),
      }))
    );

    // Save to server
    setSaving(moduleId);
    try {
      await fetch(`/api/admin/bootcamp/modules/${moduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Onboarding Settings</h3>
        <p className="text-xs text-gray-500">Configure ownership, verification, and milestone settings for each module.</p>
      </div>

      {phases.map((phase) => (
        <div key={phase.id} className="border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b">
            <h4 className="text-sm font-semibold text-brand-navy">{phase.title}</h4>
          </div>
          <div className="divide-y">
            {phase.modules.map((mod) => (
              <div key={mod.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-800">{mod.title}</span>
                  {saving === mod.id && (
                    <span className="text-[10px] text-brand-purple animate-pulse">Saving...</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Owner</label>
                    <select
                      value={mod.owner || ""}
                      onChange={(e) => updateModule(mod.id, "owner", e.target.value || null)}
                      className="w-full px-2 py-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-brand-purple"
                    >
                      <option value="">None</option>
                      <option value="FRANCHISEE">Franchisee</option>
                      <option value="FRANCHISOR">Franchisor</option>
                      <option value="COLLABORATIVE">Collaborative</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Verification</label>
                    <select
                      value={mod.verificationType || ""}
                      onChange={(e) => updateModule(mod.id, "verificationType", e.target.value || null)}
                      className="w-full px-2 py-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-brand-purple"
                    >
                      <option value="">None</option>
                      <option value="CHECKBOX">Checkbox</option>
                      <option value="FILE_UPLOAD">File Upload</option>
                      <option value="TEXT_RESPONSE">Text Response</option>
                      <option value="FRANCHISOR_CONFIRMS">Franchisor Confirms</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Target Day</label>
                    <input
                      type="number"
                      value={mod.targetDay || ""}
                      onChange={(e) => updateModule(mod.id, "targetDay", e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-2 py-1.5 border rounded text-xs focus:ring-1 focus:ring-brand-purple"
                      min={1}
                      max={90}
                      placeholder="—"
                    />
                  </div>
                  <div className="flex items-end gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mod.isMilestone}
                        onChange={(e) => updateModule(mod.id, "isMilestone", e.target.checked)}
                        className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                      />
                      <span className="text-xs text-gray-700">Milestone</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mod.notifyFranchisor}
                        onChange={(e) => updateModule(mod.id, "notifyFranchisor", e.target.checked)}
                        className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                      />
                      <span className="text-xs text-gray-700">Notify</span>
                    </label>
                  </div>
                </div>
                {mod.notifyFranchisor && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={mod.franchisorActionText || ""}
                      onChange={(e) => updateModule(mod.id, "franchisorActionText", e.target.value || null)}
                      className="w-full px-2 py-1.5 border rounded text-xs focus:ring-1 focus:ring-brand-purple"
                      placeholder="What does the franchisor need to do?"
                    />
                  </div>
                )}
              </div>
            ))}
            {phase.modules.length === 0 && (
              <div className="px-4 py-3 text-xs text-gray-400">No modules in this phase</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
