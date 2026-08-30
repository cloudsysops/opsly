"use client";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const UNIT_OPTIONS = [
  { value: "minutes", label: "Minutes", multiplier: 1 },
  { value: "hours", label: "Hours", multiplier: 60 },
  { value: "days", label: "Days", multiplier: 1440 },
];

interface ConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
}

export default function WaitConfig({ data, onChange }: ConfigProps) {
  const waitValue = (data.waitValue as number) || 1;
  const waitUnit = (data.waitUnit as string) || "hours";

  const unitOption = UNIT_OPTIONS.find((u) => u.value === waitUnit);
  const multiplier = unitOption?.multiplier || 60;
  const delayMinutes = waitValue * multiplier;

  function handleValueChange(newValue: number) {
    const computed = newValue * multiplier;
    onChange({ waitValue: newValue, delayMinutes: computed });
  }

  function handleUnitChange(newUnit: string) {
    const newMultiplier =
      UNIT_OPTIONS.find((u) => u.value === newUnit)?.multiplier || 60;
    const computed = waitValue * newMultiplier;
    onChange({ waitUnit: newUnit, delayMinutes: computed });
  }

  return (
    <div className="space-y-4">
      {/* Duration Value */}
      <div>
        <label className={labelClass}>Wait Duration</label>
        <div className="flex gap-2">
          <input
            type="number"
            className={inputClass}
            min={1}
            value={waitValue}
            onChange={(e) =>
              handleValueChange(Math.max(1, Number(e.target.value) || 1))
            }
          />
          <select
            className={inputClass}
            value={waitUnit}
            onChange={(e) => handleUnitChange(e.target.value)}
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calculated Display */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
        <span className="text-sm text-amber-800">
          = {delayMinutes.toLocaleString()} minute
          {delayMinutes !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
