"use client";

const TRIGGER_TYPES = [
  { value: "NEW_INQUIRY", label: "New Inquiry" },
  { value: "STAGE_CHANGE", label: "Stage Change" },
  { value: "INACTIVITY", label: "Inactivity" },
  { value: "FORM_SUBMITTED", label: "Form Submitted" },
  { value: "PREWORK_COMPLETED", label: "Pre-work Completed" },
  { value: "MANUAL", label: "Manual Trigger" },
];

const PIPELINE_STAGES = [
  { value: "NEW_INQUIRY", label: "New Inquiry" },
  { value: "INITIAL_CONTACT", label: "Initial Contact" },
  { value: "DISCOVERY_CALL", label: "Discovery Call" },
  { value: "PRE_WORK_IN_PROGRESS", label: "Pre-work In Progress" },
  { value: "PRE_WORK_COMPLETE", label: "Pre-work Complete" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "SELECTION_REVIEW", label: "Selection Review" },
  { value: "SELECTED", label: "Selected" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

interface ConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
}

export default function TriggerConfig({ data, onChange }: ConfigProps) {
  const triggerType = (data.triggerType as string) || "";
  const triggerConfig = (data.triggerConfig as Record<string, unknown>) || {};
  const minScore = data.minScore as number | undefined;
  const territory = (data.territory as string) || "";

  return (
    <div className="space-y-4">
      {/* Trigger Type */}
      <div>
        <label className={labelClass}>Trigger Type</label>
        <select
          className={inputClass}
          value={triggerType}
          onChange={(e) => onChange({ triggerType: e.target.value })}
        >
          <option value="">Select a trigger...</option>
          {TRIGGER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Conditional: STAGE_CHANGE */}
      {triggerType === "STAGE_CHANGE" && (
        <>
          <div>
            <label className={labelClass}>From Stage</label>
            <select
              className={inputClass}
              value={(triggerConfig.fromStage as string) || ""}
              onChange={(e) =>
                onChange({
                  triggerConfig: { ...triggerConfig, fromStage: e.target.value },
                })
              }
            >
              <option value="">Any stage</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>To Stage</label>
            <select
              className={inputClass}
              value={(triggerConfig.toStage as string) || ""}
              onChange={(e) =>
                onChange({
                  triggerConfig: { ...triggerConfig, toStage: e.target.value },
                })
              }
            >
              <option value="">Any stage</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Conditional: INACTIVITY */}
      {triggerType === "INACTIVITY" && (
        <div>
          <label className={labelClass}>Days of Inactivity</label>
          <input
            type="number"
            className={inputClass}
            min={1}
            value={(triggerConfig.inactivityDays as number) || ""}
            placeholder="e.g. 7"
            onChange={(e) =>
              onChange({
                triggerConfig: {
                  ...triggerConfig,
                  inactivityDays: e.target.value ? Number(e.target.value) : undefined,
                },
              })
            }
          />
        </div>
      )}

      {/* Min Score (optional) */}
      <div>
        <label className={labelClass}>
          Min Score <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="number"
          className={inputClass}
          min={0}
          value={minScore ?? ""}
          placeholder="e.g. 50"
          onChange={(e) =>
            onChange({
              minScore: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>

      {/* Territory (optional) */}
      <div>
        <label className={labelClass}>
          Territory <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          className={inputClass}
          value={territory}
          placeholder="e.g. Westside"
          onChange={(e) => onChange({ territory: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
