"use client";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const URGENCY_LEVELS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

interface ConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
}

export default function NotifyAdminConfig({ data, onChange }: ConfigProps) {
  const message = (data.message as string) || "";
  const urgency = (data.urgency as string) || "normal";

  return (
    <div className="space-y-4">
      {/* Message */}
      <div>
        <label className={labelClass}>Notification Message</label>
        <textarea
          className={inputClass}
          rows={4}
          value={message}
          placeholder="Enter notification message..."
          onChange={(e) => onChange({ message: e.target.value })}
        />
      </div>

      {/* Urgency */}
      <div>
        <label className={labelClass}>Urgency</label>
        <select
          className={inputClass}
          value={urgency}
          onChange={(e) => onChange({ urgency: e.target.value })}
        >
          {URGENCY_LEVELS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
