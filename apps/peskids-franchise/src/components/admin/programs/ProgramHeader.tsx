"use client";

import { useState, useRef, useEffect } from "react";
import {
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  RectangleStackIcon,
  CubeIcon,
  UserGroupIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

interface ProgramHeaderProps {
  program: {
    id: string;
    name: string;
    programType: string;
    isActive: boolean;
    isDefault: boolean;
  };
  stats: {
    phases: number;
    modules: number;
    enrolled: number;
    completed: number;
  };
  onNameUpdate: (name: string) => Promise<void>;
  onPreview: () => void;
}

const programTypeConfig: Record<
  string,
  { label: string; className: string }
> = {
  ONBOARDING: {
    label: "Onboarding",
    className: "bg-emerald-100 text-emerald-700",
  },
  CONTINUING_EDUCATION: {
    label: "Continuing Education",
    className: "bg-blue-100 text-blue-700",
  },
  CERTIFICATION: {
    label: "Certification",
    className: "bg-purple-100 text-purple-700",
  },
};

export default function ProgramHeader({
  program,
  stats,
  onNameUpdate,
  onPreview,
}: ProgramHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(program.name);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === program.name) {
      handleCancel();
      return;
    }
    setIsSaving(true);
    try {
      await onNameUpdate(trimmed);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(program.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const typeConfig = programTypeConfig[program.programType] ?? {
    label: program.programType,
    className: "bg-gray-100 text-gray-700",
  };

  const statItems = [
    { icon: RectangleStackIcon, value: stats.phases, label: "phases" },
    { icon: CubeIcon, value: stats.modules, label: "modules" },
    { icon: UserGroupIcon, value: stats.enrolled, label: "enrolled" },
    { icon: CheckBadgeIcon, value: stats.completed, label: "completed" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Top row: name + badges + preview button */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                className="text-2xl font-bold text-brand-navy border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple min-w-[200px]"
              />
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                title="Save"
              >
                <CheckIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Cancel"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-brand-navy">
                {program.name}
              </h1>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md text-gray-400 hover:text-brand-navy hover:bg-gray-100 transition-colors"
                title="Edit name"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConfig.className}`}
            >
              {typeConfig.label}
            </span>
            {program.isDefault && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                Default
              </span>
            )}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                program.isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {program.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Preview button */}
        <button
          onClick={onPreview}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-brand-purple bg-brand-purple/10 hover:bg-brand-purple/20 transition-colors shrink-0"
        >
          <EyeIcon className="h-4 w-4" />
          Preview
        </button>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 text-sm text-gray-600">
        {statItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <item.icon className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-brand-navy">{item.value}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
