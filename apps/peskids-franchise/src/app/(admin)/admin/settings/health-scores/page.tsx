"use client";

import { useState, useEffect } from "react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { DefaultContainer } from "@/components/shared/ResponsiveContainer";
import {
  HeartIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface HealthScoreConfig {
  id: string;
  financialWeight: number;
  operationalWeight: number;
  complianceWeight: number;
  engagementWeight: number;
  growthWeight: number;
  criticalThreshold: number;
  highRiskThreshold: number;
  elevatedThreshold: number;
  moderateThreshold: number;
  isActive: boolean;
}

const DEFAULT_CONFIG: Omit<HealthScoreConfig, "id" | "isActive"> = {
  financialWeight: 30,
  operationalWeight: 25,
  complianceWeight: 20,
  engagementWeight: 15,
  growthWeight: 10,
  criticalThreshold: 40,
  highRiskThreshold: 55,
  elevatedThreshold: 70,
  moderateThreshold: 85,
};

export default function HealthScoreConfigPage() {
  const [config, setConfig] = useState<HealthScoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_CONFIG);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [showRecalcConfirm, setShowRecalcConfirm] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/health-scores/config");
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        setFormData({
          financialWeight: data.config.financialWeight,
          operationalWeight: data.config.operationalWeight,
          complianceWeight: data.config.complianceWeight,
          engagementWeight: data.config.engagementWeight,
          growthWeight: data.config.growthWeight,
          criticalThreshold: data.config.criticalThreshold,
          highRiskThreshold: data.config.highRiskThreshold,
          elevatedThreshold: data.config.elevatedThreshold,
          moderateThreshold: data.config.moderateThreshold,
        });
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate weights sum to 100
    const totalWeight =
      formData.financialWeight +
      formData.operationalWeight +
      formData.complianceWeight +
      formData.engagementWeight +
      formData.growthWeight;

    if (totalWeight !== 100) {
      setAlertMsg(`Weights must sum to 100%. Current total: ${totalWeight}%`);
      return;
    }

    // Validate thresholds are in order
    if (
      formData.criticalThreshold >= formData.highRiskThreshold ||
      formData.highRiskThreshold >= formData.elevatedThreshold ||
      formData.elevatedThreshold >= formData.moderateThreshold
    ) {
      setAlertMsg(
        "Thresholds must be in ascending order: Critical < High < Elevated < Moderate"
      );
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/health-scores/config", {
        method: config ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to save configuration");
      }

      await fetchConfig();
      setAlertMsg("Configuration saved successfully!");
    } catch (error) {
      console.error("Failed to save config:", error);
      setAlertMsg("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const recalculateScores = async () => {
    setShowRecalcConfirm(true);
  };

  const doRecalculateScores = async () => {
    setShowRecalcConfirm(false);
    setRecalculating(true);
    try {
      const now = new Date();
      const month = now.getMonth() === 0 ? 12 : now.getMonth();
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      const res = await fetch("/api/cron/health-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      });

      const data = await res.json();
      setAlertMsg(`Successfully calculated ${data.scoresCalculated} health scores.`);
    } catch (error) {
      console.error("Failed to recalculate:", error);
      setAlertMsg("Failed to recalculate scores");
    } finally {
      setRecalculating(false);
    }
  };

  const totalWeight =
    formData.financialWeight +
    formData.operationalWeight +
    formData.complianceWeight +
    formData.engagementWeight +
    formData.growthWeight;

  if (loading) {
    return (
      <DefaultContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </DefaultContainer>
    );
  }

  return (
    <DefaultContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Health Score Configuration</h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure the weights and thresholds for franchisee health scoring
            </p>
          </div>
          <button
            onClick={recalculateScores}
            disabled={recalculating}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${recalculating ? "animate-spin" : ""}`} />
            {recalculating ? "Recalculating..." : "Recalculate Scores"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Weights */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Category Weights</h2>
              <span
                className={`text-sm font-medium ${
                  totalWeight === 100 ? "text-green-600" : "text-red-600"
                }`}
              >
                Total: {totalWeight}%{" "}
                {totalWeight === 100 && <CheckCircleIcon className="h-4 w-4 inline" />}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Weights determine how much each category contributes to the overall health score.
              Must sum to 100%.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Financial
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.financialWeight}
                    onChange={(e) =>
                      setFormData({ ...formData, financialWeight: parseInt(e.target.value) || 0 })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">Revenue, collections, profitability</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operational
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.operationalWeight}
                    onChange={(e) =>
                      setFormData({ ...formData, operationalWeight: parseInt(e.target.value) || 0 })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">Lessons, students, tutors</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compliance
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.complianceWeight}
                    onChange={(e) =>
                      setFormData({ ...formData, complianceWeight: parseInt(e.target.value) || 0 })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">Certifications, audits</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Engagement
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.engagementWeight}
                    onChange={(e) =>
                      setFormData({ ...formData, engagementWeight: parseInt(e.target.value) || 0 })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">Academy, support, communication</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Growth
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.growthWeight}
                    onChange={(e) =>
                      setFormData({ ...formData, growthWeight: parseInt(e.target.value) || 0 })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">Expansion, new students</p>
              </div>
            </div>
          </div>

          {/* Risk Thresholds */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Risk Thresholds</h2>
            <p className="text-sm text-gray-500 mb-6">
              Define the score ranges for each risk level. Scores below each threshold fall into
              that risk category.
            </p>

            <div className="space-y-6">
              {/* Visual representation */}
              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-red-500"
                  style={{ width: `${formData.criticalThreshold}%` }}
                />
                <div
                  className="absolute inset-y-0 bg-orange-500"
                  style={{
                    left: `${formData.criticalThreshold}%`,
                    width: `${formData.highRiskThreshold - formData.criticalThreshold}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 bg-yellow-500"
                  style={{
                    left: `${formData.highRiskThreshold}%`,
                    width: `${formData.elevatedThreshold - formData.highRiskThreshold}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 bg-blue-500"
                  style={{
                    left: `${formData.elevatedThreshold}%`,
                    width: `${formData.moderateThreshold - formData.elevatedThreshold}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 right-0 bg-green-500"
                  style={{ width: `${100 - formData.moderateThreshold}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span className="text-red-600">Critical (&lt;{formData.criticalThreshold})</span>
                <span className="text-orange-600">High (&lt;{formData.highRiskThreshold})</span>
                <span className="text-yellow-600">Elevated (&lt;{formData.elevatedThreshold})</span>
                <span className="text-blue-600">Moderate (&lt;{formData.moderateThreshold})</span>
                <span className="text-green-600">Low</span>
                <span>100</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-red-700 mb-1">
                    Critical Threshold
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.criticalThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        criticalThreshold: parseInt(e.target.value) || 0,
                      })
                    }
                    className="block w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-orange-700 mb-1">
                    High Risk Threshold
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.highRiskThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        highRiskThreshold: parseInt(e.target.value) || 0,
                      })
                    }
                    className="block w-full rounded-md border-orange-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-yellow-700 mb-1">
                    Elevated Threshold
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.elevatedThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        elevatedThreshold: parseInt(e.target.value) || 0,
                      })
                    }
                    className="block w-full rounded-md border-yellow-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Moderate Threshold
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.moderateThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        moderateThreshold: parseInt(e.target.value) || 0,
                      })
                    }
                    className="block w-full rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setFormData(DEFAULT_CONFIG)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Reset to Defaults
            </button>
            <button
              type="submit"
              disabled={saving || totalWeight !== 100}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-purple rounded-md hover:bg-brand-purple/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={!!alertMsg}
        title="Notice"
        message={alertMsg || ""}
        confirmLabel="OK"
        cancelLabel=""
        confirmVariant="primary"
        onConfirm={() => setAlertMsg(null)}
        onCancel={() => setAlertMsg(null)}
      />

      <ConfirmModal
        isOpen={showRecalcConfirm}
        title="Recalculate Health Scores"
        message="This will recalculate health scores for all franchisees. This may take a few moments. Continue?"
        confirmLabel="Recalculate"
        confirmVariant="primary"
        onConfirm={doRecalculateScores}
        onCancel={() => setShowRecalcConfirm(false)}
      />
    </DefaultContainer>
  );
}
