"use client";

import { useState, useCallback, useRef } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
} from "reactflow";

// ============================================
// ACTION LABEL MAP
// ============================================

const ACTION_LABELS: Record<string, string> = {
  SEND_EMAIL: "Send Email",
  CREATE_TASK: "Create Task",
  NOTIFY_ADMIN: "Notify Admin",
  CHANGE_STAGE: "Change Stage",
  ADD_NOTE: "Add Note",
};

// ============================================
// TYPES
// ============================================

export interface WorkflowMeta {
  name: string;
  category: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  isActive: boolean;
}

interface WorkflowApiResponse {
  workflow: {
    id: string;
    name: string;
    description?: string;
    triggerType: string;
    triggerConfig: Record<string, unknown>;
    isActive: boolean;
    flowData?: { nodes?: Node[]; edges?: Edge[] } | null;
    category?: string;
    actions: Array<{
      id: string;
      actionType: string;
      actionConfig: Record<string, unknown>;
      delayMinutes: number;
      order: number;
      nodeId?: string;
    }>;
    conditions: Array<{
      id: string;
      nodeId: string;
      field: string;
      operator: string;
      value: string;
    }>;
  };
}

// ============================================
// HOOK
// ============================================

export function useWorkflowBuilder() {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowMeta, setWorkflowMeta] = useState<WorkflowMeta>({
    name: "",
    category: "",
    triggerType: "",
    triggerConfig: {},
    isActive: false,
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Track whether we're in the initial load to avoid marking dirty
  const isInitializing = useRef(false);

  // ------------------------------------------
  // load(id)
  // ------------------------------------------
  const load = useCallback(
    async (id: string) => {
      setIsLoading(true);
      isInitializing.current = true;
      try {
        const res = await fetch(`/api/admin/workflows/${id}`);
        if (!res.ok) throw new Error("Failed to load workflow");
        const data: WorkflowApiResponse = await res.json();
        const wf = data.workflow;

        setWorkflowId(wf.id);
        setWorkflowMeta({
          name: wf.name,
          category: wf.category || "",
          triggerType: wf.triggerType,
          triggerConfig:
            typeof wf.triggerConfig === "object" && wf.triggerConfig !== null
              ? (wf.triggerConfig as Record<string, unknown>)
              : {},
          isActive: wf.isActive,
        });

        // Parse flowData for canvas state
        if (wf.flowData && typeof wf.flowData === "object") {
          const fd = wf.flowData as { nodes?: Node[]; edges?: Edge[] };
          setNodes(fd.nodes || []);
          setEdges(fd.edges || []);
        } else {
          // No saved canvas — create a default trigger node
          const triggerNode: Node = {
            id: `trigger-${Date.now()}`,
            type: "trigger",
            position: { x: 250, y: 50 },
            data: {
              triggerType: wf.triggerType || "NEW_INQUIRY",
              triggerConfig: wf.triggerConfig || {},
            },
          };
          setNodes([triggerNode]);
          setEdges([]);
        }

        setIsDirty(false);
      } catch (err) {
        console.error("[useWorkflowBuilder] load error:", err);
      } finally {
        setIsLoading(false);
        // Small delay to let React Flow settle before tracking dirty
        setTimeout(() => {
          isInitializing.current = false;
        }, 200);
      }
    },
    [setNodes, setEdges]
  );

  // ------------------------------------------
  // save()
  // ------------------------------------------
  const save = useCallback(async () => {
    if (!workflowId) return;
    setIsSaving(true);

    try {
      // Extract trigger node data
      const triggerNode = nodes.find((n) => n.type === "trigger");
      const triggerType =
        (triggerNode?.data?.triggerType as string) || workflowMeta.triggerType;
      const triggerConfig =
        (triggerNode?.data?.triggerConfig as Record<string, unknown>) ||
        workflowMeta.triggerConfig;

      // Build actions from action + wait nodes
      const actionNodes = nodes.filter(
        (n) => n.type === "action" || n.type === "wait"
      );
      const actions = actionNodes.map((node, index) => ({
        actionType:
          node.type === "wait"
            ? "SEND_EMAIL" // wait nodes don't have their own action type; use placeholder
            : (node.data?.actionType as string) || "SEND_EMAIL",
        actionConfig: {
          ...(typeof node.data === "object" ? node.data : {}),
          _nodeType: node.type,
        },
        delayMinutes:
          node.type === "wait"
            ? (node.data?.delayMinutes as number) || 0
            : 0,
        order: index,
        nodeId: node.id,
      }));

      // Build conditions from condition nodes
      const conditionNodes = nodes.filter((n) => n.type === "condition");
      const conditions = conditionNodes.map((node) => ({
        nodeId: node.id,
        field: (node.data?.field as string) || "",
        operator: (node.data?.operator as string) || "",
        value: (node.data?.value as string) || "",
      }));

      // Build flowData (full canvas state)
      const flowData = {
        nodes,
        edges,
      };

      const res = await fetch(`/api/admin/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflowMeta.name,
          triggerType,
          triggerConfig,
          category: workflowMeta.category,
          flowData,
          actions,
          conditions,
        }),
      });

      if (!res.ok) throw new Error("Failed to save workflow");

      setIsDirty(false);
    } catch (err) {
      console.error("[useWorkflowBuilder] save error:", err);
    } finally {
      setIsSaving(false);
    }
  }, [workflowId, nodes, edges, workflowMeta]);

  // ------------------------------------------
  // addNode(type, position, actionType?)
  // ------------------------------------------
  const addNode = useCallback(
    (
      type: string,
      position: { x: number; y: number },
      actionType?: string
    ) => {
      const nodeId = `${type}-${Date.now()}`;

      let data: Record<string, unknown> = {};

      switch (type) {
        case "trigger":
          data = { triggerType: "NEW_INQUIRY" };
          break;
        case "action":
          data = {
            actionType: actionType || "SEND_EMAIL",
            label: ACTION_LABELS[actionType || "SEND_EMAIL"] || actionType,
          };
          break;
        case "wait":
          data = { delayMinutes: 60, waitValue: 1, waitUnit: "hours" };
          break;
        case "condition":
          data = { field: "", operator: "", value: "" };
          break;
      }

      const newNode: Node = {
        id: nodeId,
        type,
        position,
        data,
      };

      setNodes((nds) => [...nds, newNode]);
      setIsDirty(true);
    },
    [setNodes]
  );

  // ------------------------------------------
  // updateNodeData(nodeId, updates)
  // ------------------------------------------
  const updateNodeData = useCallback(
    (nodeId: string, updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
        )
      );
      // Also update selectedNode if it matches
      setSelectedNode((prev) =>
        prev && prev.id === nodeId
          ? { ...prev, data: { ...prev.data, ...updates } }
          : prev
      );
      setIsDirty(true);
    },
    [setNodes]
  );

  // ------------------------------------------
  // removeNode(nodeId)
  // ------------------------------------------
  const removeNode = useCallback(
    (nodeId: string) => {
      // Find the node to check if it's a trigger
      const node = nodes.find((n) => n.id === nodeId);
      if (node?.type === "trigger") {
        // Don't actually prevent it, but the caller can warn if needed
      }

      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
      setSelectedNode((prev) => (prev?.id === nodeId ? null : prev));
      setIsDirty(true);
    },
    [nodes, setNodes, setEdges]
  );

  // ------------------------------------------
  // onConnect(connection)
  // ------------------------------------------
  const onConnect = useCallback(
    (connection: Connection) => {
      // For condition nodes: auto-assign sourceHandle
      const sourceNode = nodes.find((n) => n.id === connection.source);
      let conn = { ...connection };

      if (sourceNode?.type === "condition" && !connection.sourceHandle) {
        // Count existing edges from this source to pick "yes" or "no"
        const existingFromSource = edges.filter(
          (e) => e.source === connection.source
        );
        conn.sourceHandle = existingFromSource.length === 0 ? "yes" : "no";
      }

      setEdges((eds) => addEdge(conn, eds));
      setIsDirty(true);
    },
    [nodes, edges, setEdges]
  );

  // ------------------------------------------
  // Wrapped change handlers (track dirty state)
  // ------------------------------------------
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChangeBase(changes);
      // Only mark dirty for meaningful changes (not selection)
      if (!isInitializing.current) {
        const hasMeaningful = changes.some(
          (c) => c.type !== "select" && c.type !== "dimensions"
        );
        if (hasMeaningful) {
          setIsDirty(true);
        }
      }
    },
    [onNodesChangeBase]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChangeBase(changes);
      if (!isInitializing.current) {
        setIsDirty(true);
      }
    },
    [onEdgesChangeBase]
  );

  // ------------------------------------------
  // selectNode
  // ------------------------------------------
  const selectNode = useCallback((node: Node | null) => {
    setSelectedNode(node);
  }, []);

  return {
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
  };
}
