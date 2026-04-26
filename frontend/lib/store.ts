import { create } from "zustand";

export type SpatialView = "building" | "floor";

export type EntityKind = "person" | "group" | "room" | "project" | "paper" | "news" | "area";
export interface DossierTarget { kind: EntityKind; id: string; }

interface UIState {
  view: SpatialView;
  activeFloor: number | null;
  selectedRoomId: string | null;
  hoveredRoomId: string | null;
  graphOpen: boolean;
  dossier: DossierTarget | null;

  enterFloor: (n: number) => void;
  exitFloor: () => void;
  selectRoom: (id: string | null) => void;
  hoverRoom: (id: string | null) => void;
  setGraphOpen: (open: boolean) => void;
  openDossier: (target: DossierTarget) => void;
  closeDossier: () => void;
  reset: () => void;
}

export const useUI = create<UIState>((set) => ({
  view: "building",
  activeFloor: null,
  selectedRoomId: null,
  hoveredRoomId: null,
  graphOpen: false,
  dossier: null,

  enterFloor: (n) => set({ view: "floor", activeFloor: n, selectedRoomId: null }),
  exitFloor: () => set({ view: "building", activeFloor: null, selectedRoomId: null, dossier: null }),
  selectRoom: (id) => set((s) => ({
    selectedRoomId: id,
    dossier: id ? { kind: "room", id } : (s.dossier?.kind === "room" ? null : s.dossier),
  })),
  hoverRoom: (id) => set({ hoveredRoomId: id }),
  setGraphOpen: (open) => set({ graphOpen: open }),
  openDossier: (target) => set({ dossier: target }),
  closeDossier: () => set((s) => ({ dossier: null, selectedRoomId: s.dossier?.kind === "room" ? null : s.selectedRoomId })),
  reset: () => set({ view: "building", activeFloor: null, selectedRoomId: null, hoveredRoomId: null, dossier: null }),
}));
