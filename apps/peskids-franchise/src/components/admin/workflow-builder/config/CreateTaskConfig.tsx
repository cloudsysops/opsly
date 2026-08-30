"use client";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

interface ConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
}

export default function CreateTaskConfig({ data, onChange }: ConfigProps) {
  const title = (data.title as string) || "";
  const description = (data.description as string) || "";
  const priority = (data.priority as string) || "MEDIUM";
  const assignTo = (data.assignTo as string) || "";

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className={labelClass}>Title</label>
        <input
          type="text"
          className={inputClass}
          value={title}
          placeholder="Task title"
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Description</label>
        <textarea
          className={inputClass}
          rows={3}
          value={description}
          placeholder="Task description..."
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      {/* Priority */}
      <div>
        <label className={labelClass}>Priority</label>
        <select
          className={inputClass}
          value={priority}
          onChange={(e) => onChange({ priority: e.target.value })}
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Assign To */}
      <div>
        <label className={labelClass}>
          Assign To{" "}
          <span className="text-gray-400 font-normal">(admin email)</span>
        </label>
        <input
          type="email"
          className={inputClass}
          value={assignTo}
          placeholder="admin@acmefranchise.com"
          onChange={(e) => onChange({ assignTo: e.target.value })}
        />
      </div>
    </div>
  );
}
