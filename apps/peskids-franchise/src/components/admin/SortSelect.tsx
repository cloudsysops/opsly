"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface SortOption {
  value: string;
  label: string;
}

interface SortSelectProps {
  options: SortOption[];
  defaultValue: string;
  paramName?: string;
}

export function SortSelect({ options, defaultValue, paramName = "sort" }: SortSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, e.target.value);
    router.push(`?${params.toString()}`);
  };

  return (
    <select
      name={paramName}
      defaultValue={defaultValue}
      onChange={handleChange}
      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent text-sm"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
