"use client";

import {
  BoltIcon,
  EnvelopeIcon,
  ClipboardDocumentListIcon,
  BellAlertIcon,
  ArrowRightCircleIcon,
  DocumentTextIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon,
  UserMinusIcon,
  CheckBadgeIcon,
  HandRaisedIcon,
} from "@heroicons/react/24/solid";
import type { DragEvent } from "react";

// ============================================
// PALETTE ITEM CONFIG
// ============================================

interface PaletteItem {
  type: string;
  actionType?: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface PaletteGroup {
  heading: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  items: PaletteItem[];
}

const PALETTE_GROUPS: PaletteGroup[] = [
  {
    heading: "Triggers",
    colorClass: "text-green-600",
    bgClass: "bg-green-50",
    borderClass: "border-green-200 hover:border-green-400",
    items: [
      { type: "trigger", actionType: "NEW_INQUIRY", label: "New Inquiry", icon: BoltIcon },
      { type: "trigger", actionType: "STAGE_CHANGE", label: "Stage Change", icon: ArrowPathIcon },
      { type: "trigger", actionType: "INACTIVITY", label: "Inactivity", icon: UserMinusIcon },
      { type: "trigger", actionType: "PREWORK_COMPLETED", label: "Pre-work Completed", icon: CheckBadgeIcon },
      { type: "trigger", actionType: "MANUAL", label: "Manual", icon: HandRaisedIcon },
    ],
  },
  {
    heading: "Actions",
    colorClass: "text-blue-600",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200 hover:border-blue-400",
    items: [
      { type: "action", actionType: "SEND_EMAIL", label: "Send Email", icon: EnvelopeIcon },
      { type: "action", actionType: "CREATE_TASK", label: "Create Task", icon: ClipboardDocumentListIcon },
      { type: "action", actionType: "NOTIFY_ADMIN", label: "Notify Admin", icon: BellAlertIcon },
      { type: "action", actionType: "CHANGE_STAGE", label: "Change Stage", icon: ArrowRightCircleIcon },
      { type: "action", actionType: "ADD_NOTE", label: "Add Note", icon: DocumentTextIcon },
    ],
  },
  {
    heading: "Flow Control",
    colorClass: "text-amber-600",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200 hover:border-amber-400",
    items: [
      { type: "wait", label: "Wait", icon: ClockIcon },
      { type: "condition", label: "Condition", icon: QuestionMarkCircleIcon },
    ],
  },
];

// ============================================
// COMPONENT
// ============================================

export default function NodePalette() {
  function handleDragStart(
    event: DragEvent<HTMLDivElement>,
    item: PaletteItem
  ) {
    const payload: { type: string; actionType?: string } = { type: item.type };
    if (item.actionType) {
      payload.actionType = item.actionType;
    }
    event.dataTransfer.setData(
      "application/workflow-node",
      JSON.stringify(payload)
    );
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="w-56 border-r border-gray-200 bg-gray-50 p-3 overflow-y-auto flex-shrink-0">
      <div className="mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Node Palette
        </h3>
      </div>

      {PALETTE_GROUPS.map((group) => (
        <div key={group.heading} className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            {group.heading}
          </h4>
          <div className="space-y-1.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={`${item.type}-${item.actionType || item.label}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-colors ${group.bgClass} ${group.borderClass}`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${group.colorClass}`} />
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
