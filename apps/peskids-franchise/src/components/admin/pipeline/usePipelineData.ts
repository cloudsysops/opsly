"use client";

import { useState, useMemo, useCallback } from "react";
import {
  PipelineProspect,
  BoardColumn,
  BOARD_COLUMNS,
  STALE_THRESHOLD_DAYS,
  getDaysInStage,
} from "./pipelineConfig";

interface PipelineStats {
  total: number;
  avgScore: number;
  staleCount: number;
  conversionRate: number;
}

interface ColumnData {
  column: BoardColumn;
  prospects: PipelineProspect[];
}

interface PendingMove {
  prospectId: string;
  prospectName: string;
  fromColumn: BoardColumn;
  toColumn: BoardColumn;
}

export function usePipelineData(initialProspects: PipelineProspect[]) {
  const [prospects, setProspects] = useState<PipelineProspect[]>(initialProspects);
  const [searchQuery, setSearchQuery] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  // Get unique territories for dropdown
  const territories = useMemo(() => {
    const set = new Set<string>();
    prospects.forEach((p) => {
      if (p.preferredTerritory) set.add(p.preferredTerritory);
    });
    return Array.from(set).sort();
  }, [prospects]);

  // Filter prospects
  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = `${p.firstName} ${p.lastName}`.toLowerCase().includes(q);
        const emailMatch = p.email.toLowerCase().includes(q);
        const territoryMatch = p.preferredTerritory?.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !territoryMatch) return false;
      }

      // Territory filter
      if (territoryFilter !== "all" && p.preferredTerritory !== territoryFilter) {
        return false;
      }

      // Score filter
      if (scoreFilter === "high" && p.prospectScore < 80) return false;
      if (scoreFilter === "medium" && (p.prospectScore < 50 || p.prospectScore >= 80)) return false;
      if (scoreFilter === "low" && p.prospectScore >= 50) return false;

      return true;
    });
  }, [prospects, searchQuery, territoryFilter, scoreFilter]);

  // Group into columns
  const columnData: ColumnData[] = useMemo(() => {
    return BOARD_COLUMNS.map((column) => ({
      column,
      prospects: filteredProspects
        .filter((p) => column.includedStages.includes(p.pipelineStage))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }));
  }, [filteredProspects]);

  // Stats
  const stats: PipelineStats = useMemo(() => {
    const total = prospects.length;
    const avgScore = total > 0 ? Math.round(prospects.reduce((sum, p) => sum + p.prospectScore, 0) / total) : 0;
    const staleCount = prospects.filter((p) => getDaysInStage(p.updatedAt) >= STALE_THRESHOLD_DAYS).length;
    const interviewPlusStages = ["INTERVIEW", "SELECTION_REVIEW", "SELECTED"];
    const interviewPlus = prospects.filter((p) => interviewPlusStages.includes(p.pipelineStage)).length;
    const conversionRate = total > 0 ? Math.round((interviewPlus / total) * 100) : 0;
    return { total, avgScore, staleCount, conversionRate };
  }, [prospects]);

  // Initiate a move (show confirmation)
  const requestMove = useCallback(
    (prospectId: string, toColumnId: string) => {
      const prospect = prospects.find((p) => p.id === prospectId);
      if (!prospect) return;

      const fromColumn = BOARD_COLUMNS.find((col) => col.includedStages.includes(prospect.pipelineStage));
      const toColumn = BOARD_COLUMNS.find((col) => col.id === toColumnId);

      if (!fromColumn || !toColumn || fromColumn.id === toColumn.id) return;

      setPendingMove({
        prospectId,
        prospectName: `${prospect.firstName} ${prospect.lastName}`,
        fromColumn,
        toColumn,
      });
    },
    [prospects]
  );

  // Confirm the move
  const confirmMove = useCallback(async () => {
    if (!pendingMove) return;

    const { prospectId, toColumn } = pendingMove;
    const newStage = toColumn.primaryStage;

    // Save old state for rollback
    const oldProspects = [...prospects];

    // Optimistic update
    setProspects((prev) =>
      prev.map((p) =>
        p.id === prospectId
          ? { ...p, pipelineStage: newStage, updatedAt: new Date().toISOString() }
          : p
      )
    );
    setPendingMove(null);
    setIsMoving(true);
    setError(null);

    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: newStage }),
      });

      if (!res.ok) {
        throw new Error("Failed to update stage");
      }
    } catch {
      // Rollback
      setProspects(oldProspects);
      setError("Failed to move prospect. Please try again.");
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsMoving(false);
    }
  }, [pendingMove, prospects]);

  // Cancel the move
  const cancelMove = useCallback(() => {
    setPendingMove(null);
  }, []);

  return {
    columnData,
    stats,
    territories,
    filters: {
      searchQuery,
      setSearchQuery,
      territoryFilter,
      setTerritoryFilter,
      scoreFilter,
      setScoreFilter,
    },
    pendingMove,
    requestMove,
    confirmMove,
    cancelMove,
    isMoving,
    error,
  };
}
