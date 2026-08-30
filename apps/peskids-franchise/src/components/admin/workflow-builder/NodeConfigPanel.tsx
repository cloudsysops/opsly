"use client";

import type { Node } from "reactflow";
import {
  BoltIcon,
  EnvelopeIcon,
  ClipboardDocumentListIcon,
  BellAlertIcon,
  ArrowRightCircleIcon,
  DocumentTextIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import TriggerConfig from "./config/TriggerConfig";
import SendEmailConfig from "./config/SendEmailConfig";
import CreateTaskConfig from "./config/CreateTaskConfig";
import NotifyAdminConfig from "./config/NotifyAdminConfig";
import ChangeStageConfig from "./config/ChangeStageConfig";
import AddNoteConfig from "./config/AddNoteConfig";
import WaitConfig from "./config/WaitConfig";
import ConditionConfig from "./config/ConditionConfig";

// ============================================
// TYPES
// ============================================

interface NodeConfigPanelProps {
  selectedNode: Node | null;
  onUpdateNodeData: (
    nodeId: string,
    updates: Record<string, unknown>
  ) => void;
  onDeleteNode: (nodeId: string) => void;
}

// ============================================
// NODE TYPE META (icons + labels)
// ============================================

const NODE_META: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    colorClass: string;
    bgClass: string;
  }
> = {
  trigger: {
    label: "Trigger",
    icon: BoltIcon,
    colorClass: "text-green-600",
    bgClass: "bg-green-100",
  },
  SEND_EMAIL: {
    label: "Send Email",
    icon: EnvelopeIcon,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-100",
  },
  CREATE_TASK: {
    label: "Create Task",
    icon: ClipboardDocumentListIcon,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-100",
  },
  NOTIFY_ADMIN: {
    label: "Notify Admin",
    icon: BellAlertIcon,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-100",
  },
  CHANGE_STAGE: {
    label: "Change Stage",
    icon: ArrowRightCircleIcon,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-100",
  },
  ADD_NOTE: {
    label: "Add Note",
    icon: DocumentTextIcon,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-100",
  },
  wait: {
    label: "Wait / Delay",
    icon: ClockIcon,
    colorClass: "text-amber-600",
    bgClass: "bg-amber-100",
  },
  condition: {
    label: "Condition",
    icon: QuestionMarkCircleIcon,
    colorClass: "text-purple-600",
    bgClass: "bg-purple-100",
  },
};

// ============================================
// CONFIG PANEL
// ============================================

export default function NodeConfigPanel({
  selectedNode,
  onUpdateNodeData,
  onDeleteNode,
}: NodeConfigPanelProps) {
  if (!selectedNode) {
    return null;
  }

  const nodeType = selectedNode.type || "action";
  const actionType = (selectedNode.data?.actionType as string) || "";
  const data = (selectedNode.data as Record<string, unknown>) || {};

  // Determine the meta key for icons/labels
  let metaKey: string;
  if (nodeType === "trigger") {
    metaKey = "trigger";
  } else if (nodeType === "wait") {
    metaKey = "wait";
  } else if (nodeType === "condition") {
    metaKey = "condition";
  } else {
    metaKey = actionType;
  }

  const meta = NODE_META[metaKey] || {
    label: nodeType,
    icon: BoltIcon,
    colorClass: "text-gray-600",
    bgClass: "bg-gray-100",
  };

  const Icon = meta.icon;

  function handleChange(updates: Record<string, unknown>) {
    onUpdateNodeData(selectedNode!.id, updates);
  }

  // Render the right config component
  function renderConfig() {
    if (nodeType === "trigger") {
      return <TriggerConfig data={data} onChange={handleChange} />;
    }

    if (nodeType === "wait") {
      return <WaitConfig data={data} onChange={handleChange} />;
    }

    if (nodeType === "condition") {
      return <ConditionConfig data={data} onChange={handleChange} />;
    }

    // Action nodes: delegate by actionType
    switch (actionType) {
      case "SEND_EMAIL":
        return <SendEmailConfig data={data} onChange={handleChange} />;
      case "CREATE_TASK":
        return <CreateTaskConfig data={data} onChange={handleChange} />;
      case "NOTIFY_ADMIN":
        return <NotifyAdminConfig data={data} onChange={handleChange} />;
      case "CHANGE_STAGE":
        return <ChangeStageConfig data={data} onChange={handleChange} />;
      case "ADD_NOTE":
        return <AddNoteConfig data={data} onChange={handleChange} />;
      default:
        return (
          <div className="text-sm text-gray-500 py-4 text-center">
            No configuration available for this node type.
          </div>
        );
    }
  }

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${meta.bgClass}`}>
            <Icon className={`w-4 h-4 ${meta.colorClass}`} />
          </div>
          <div>
            <div
              className={`text-[10px] font-medium uppercase tracking-wider ${meta.colorClass}`}
            >
              Configure
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {meta.label}
            </div>
          </div>
        </div>
      </div>

      {/* Config Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">{renderConfig()}</div>

      {/* Delete Button */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          onClick={() => onDeleteNode(selectedNode.id)}
        >
          <TrashIcon className="w-4 h-4" />
          Delete Node
        </button>
      </div>
    </div>
  );
}
