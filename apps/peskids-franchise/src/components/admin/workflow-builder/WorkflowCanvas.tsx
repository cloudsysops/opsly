"use client";

import { useCallback, useEffect, useRef, type DragEvent } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { nodeTypes } from "./nodes/nodeTypes";
import { useWorkflowBuilder } from "./useWorkflowBuilder";
import NodePalette from "./NodePalette";
import NodeConfigPanel from "./NodeConfigPanel";
import WorkflowTopBar from "./WorkflowTopBar";

// ============================================
// MINIMAP NODE COLORS
// ============================================

function minimapNodeColor(node: Node): string {
  switch (node.type) {
    case "trigger":
      return "#22c55e"; // green-500
    case "action":
      return "#3b82f6"; // blue-500
    case "wait":
      return "#f59e0b"; // amber-500
    case "condition":
      return "#a855f7"; // purple-500
    default:
      return "#9ca3af"; // gray-400
  }
}

// ============================================
// INNER CANVAS (needs ReactFlowProvider)
// ============================================

interface InnerCanvasProps {
  workflowId: string;
}

function InnerCanvas({ workflowId }: InnerCanvasProps) {
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const {
    nodes,
    edges,
    selectedNode,
    workflowMeta,
    isDirty,
    isSaving,
    isLoading,
    onNodesChange,
    onEdgesChange,
    onConnect,
    load,
    save,
    addNode,
    updateNodeData,
    removeNode,
    selectNode,
    setWorkflowMeta,
  } = useWorkflowBuilder();

  // Load workflow on mount
  useEffect(() => {
    load(workflowId);
  }, [workflowId, load]);

  // ------------------------------------------
  // Drop handler
  // ------------------------------------------
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const raw = event.dataTransfer.getData("application/workflow-node");
      if (!raw) return;

      try {
        const { type, actionType } = JSON.parse(raw) as {
          type: string;
          actionType?: string;
        };

        // Calculate drop position relative to React Flow canvas
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        addNode(type, position, actionType);
      } catch (err) {
        console.error("[WorkflowCanvas] drop error:", err);
      }
    },
    [reactFlowInstance, addNode]
  );

  // ------------------------------------------
  // Node click / pane click
  // ------------------------------------------
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // ------------------------------------------
  // Toggle active state
  // ------------------------------------------
  const handleToggle = useCallback(async () => {
    if (!workflowId) return;
    try {
      const res = await fetch(`/api/admin/workflows/${workflowId}/toggle`, {
        method: "POST",
      });
      if (res.ok) {
        setWorkflowMeta((prev) => ({ ...prev, isActive: !prev.isActive }));
      }
    } catch (err) {
      console.error("[WorkflowCanvas] toggle error:", err);
    }
  }, [workflowId, setWorkflowMeta]);

  // ------------------------------------------
  // Meta change helper
  // ------------------------------------------
  const handleMetaChange = useCallback(
    (updates: Partial<typeof workflowMeta>) => {
      setWorkflowMeta((prev) => ({ ...prev, ...updates }));
    },
    [setWorkflowMeta]
  );

  // ------------------------------------------
  // Loading state
  // ------------------------------------------
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-navy border-t-transparent" />
          <span className="text-sm text-gray-500">Loading workflow...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <WorkflowTopBar
        workflowMeta={workflowMeta}
        onMetaChange={handleMetaChange}
        onSave={save}
        onToggle={handleToggle}
        isDirty={isDirty}
        isSaving={isSaving}
        isActive={workflowMeta.isActive}
        workflowId={workflowId}
      />

      {/* Canvas area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Node Palette */}
        <NodePalette />

        {/* Center: React Flow canvas */}
        <div
          ref={reactFlowWrapper}
          className="flex-1 relative"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode="Delete"
            className="bg-gray-50"
          >
            <Background gap={16} size={1} />
            <Controls position="bottom-left" />
            <MiniMap
              position="bottom-right"
              nodeColor={minimapNodeColor}
              maskColor="rgba(0, 0, 0, 0.1)"
              className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
            />
          </ReactFlow>
        </div>

        {/* Right: Config Panel (conditional) */}
        <NodeConfigPanel
          selectedNode={selectedNode}
          onUpdateNodeData={updateNodeData}
          onDeleteNode={removeNode}
        />
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT (wraps with ReactFlowProvider)
// ============================================

interface WorkflowCanvasProps {
  workflowId: string;
}

export default function WorkflowCanvas({ workflowId }: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <InnerCanvas workflowId={workflowId} />
    </ReactFlowProvider>
  );
}
