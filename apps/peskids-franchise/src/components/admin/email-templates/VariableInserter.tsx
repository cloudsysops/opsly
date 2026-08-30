"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, VariableIcon } from "@heroicons/react/24/outline";
import { TEMPLATE_VARIABLES, GMAIL_TEMPLATE_VARIABLES } from "@/lib/email/template-variables";

interface VariableInserterProps {
  onInsert: (variable: string) => void;
  mode?: "postmark" | "gmail";
}

export function VariableInserter({ onInsert, mode = "postmark" }: VariableInserterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const variables = mode === "gmail" ? GMAIL_TEMPLATE_VARIABLES : TEMPLATE_VARIABLES;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (variable: string) => {
    onInsert(variable);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-cyan/10 text-brand-cyan rounded hover:bg-brand-cyan/20 transition-colors"
      >
        <VariableIcon className="w-3.5 h-3.5" />
        Insert Variable
        <ChevronDownIcon className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
              {mode === "gmail" ? "Franchisee Variables" : "Prospect Variables"}
            </div>
            {Object.entries(variables).map(([key, { label, description }]) => (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-brand-navy">
                    {`{{${key}}}`}
                  </span>
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
