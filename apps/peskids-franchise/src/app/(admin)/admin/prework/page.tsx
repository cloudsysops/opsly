"use client";

import { useState, useEffect } from "react";
import { PreWorkModuleTree } from "@/components/admin/prework/PreWorkModuleTree";
import { FormBuilder } from "@/components/admin/prework/FormBuilder";

interface PreWorkModuleSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  sequence: number;
  isRequired: boolean;
  submissionType: string;
  formSchema: unknown;
  formSchemaVersion: number;
  draftFormSchema: unknown;
  draftUpdatedAt: string | null;
  draftUpdatedBy: string | null;
  hasDraft: boolean;
  submissionCount: number;
  versionCount: number;
}

export default function PreWorkCMSPage() {
  const [modules, setModules] = useState<PreWorkModuleSummary[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const res = await fetch("/api/admin/prework");
      if (!res.ok) throw new Error("Failed to fetch modules");
      const data = await res.json();
      setModules(data);
      // Select first module by default
      if (data.length > 0 && !selectedModuleId) {
        setSelectedModuleId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load modules");
    } finally {
      setLoading(false);
    }
  };

  const handleModuleUpdate = () => {
    fetchModules();
  };

  const selectedModule = modules.find((m) => m.id === selectedModuleId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchModules();
            }}
            className="px-4 py-2 bg-brand-purple text-white rounded-lg hover:bg-brand-purple/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pre-Work CMS</h1>
            <p className="text-sm text-gray-500">
              Manage pre-work module forms and questions
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {modules.length} modules
            </span>
          </div>
        </div>
      </div>

      {/* Main Content - Split Panel */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Module Tree */}
        <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <PreWorkModuleTree
            modules={modules}
            selectedModuleId={selectedModuleId}
            onSelectModule={setSelectedModuleId}
          />
        </div>

        {/* Right Panel - Form Builder */}
        <div className="flex-1 overflow-hidden">
          {selectedModule ? (
            <FormBuilder
              moduleId={selectedModule.id}
              moduleTitle={selectedModule.title}
              onUpdate={handleModuleUpdate}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a module to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
