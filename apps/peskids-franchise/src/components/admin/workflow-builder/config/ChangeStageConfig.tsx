"use client";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const PIPELINE_STAGES = [
  { value: "NEW_INQUIRY", label: "New Inquiry" },
  { value: "INITIAL_CONTACT", label: "Initial Contact" },
  { value: "DISCOVERY_CALL", label: "Discovery Call" },
  { value: "PRE_WORK_IN_PROGRESS", label: "Pre-work In Progress" },
  { value: "PRE_WORK_COMPLETE", label: "Pre-work Complete" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "SELECTION_REVIEW", label: "Selection Review" },
  { value: "SELECTED", label: "Selected" },
];

interface ConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
}

export default function ChangeStageConfig({ data, onChange }: ConfigProps) {
  const targetStage = (data.targetStage as string) || "";

  return (
    <div className="space-y-4">
      {/* Target Stage */}
      <div>
        <label className={labelClass}>Move Prospect To</label>
        <select
          className={inputClass}
          value={targetStage}
          onChange={(e) => onChange({ targetStage: e.target.value })}
        >
          <option value="">Select target stage...</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
