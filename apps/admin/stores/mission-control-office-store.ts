import { create } from 'zustand';

export interface MissionControlOfficeState {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  /** Tick para futuro SSE/WebSocket; polling usa SWR refreshInterval */
  liveEpoch: number;
  bumpLiveEpoch: () => void;
}

export const useMissionControlOfficeStore = create<MissionControlOfficeState>((set) => ({
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  liveEpoch: 0,
  bumpLiveEpoch: () => set((s) => ({ liveEpoch: s.liveEpoch + 1 })),
}));
