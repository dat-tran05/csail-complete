import { create } from "zustand";

export type ViewMode = "exterior" | "floor";

interface UIState {
  view: ViewMode;
  activeFloor: number | null;
  selectedRoomId: string | null;
  hoveredRoomId: string | null;
  graphOpen: boolean;

  enterFloor: (n: number) => void;
  exitFloor: () => void;
  selectRoom: (id: string | null) => void;
  hoverRoom: (id: string | null) => void;
  setGraphOpen: (open: boolean) => void;
  reset: () => void;
}

export const useUI = create<UIState>((set) => ({
  view: "exterior",
  activeFloor: null,
  selectedRoomId: null,
  hoveredRoomId: null,
  graphOpen: false,

  enterFloor: (n) => set({ view: "floor", activeFloor: n, selectedRoomId: null }),
  exitFloor: () => set({ view: "exterior", activeFloor: null, selectedRoomId: null }),
  selectRoom: (id) => set({ selectedRoomId: id }),
  hoverRoom: (id) => set({ hoveredRoomId: id }),
  setGraphOpen: (open) => set({ graphOpen: open }),
  reset: () => set({ view: "exterior", activeFloor: null, selectedRoomId: null, hoveredRoomId: null }),
}));
