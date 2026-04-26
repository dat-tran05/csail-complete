import { create } from "zustand";

export type SpatialView = "building" | "floor";

export type EntityKind = "person" | "group" | "room" | "project" | "paper" | "news" | "area";
export interface DossierTarget { kind: EntityKind; id: string; }

export type FloorLayer = "heatmap" | "news" | "arcs";

interface UIState {
  view: SpatialView;
  activeFloor: number | null;
  selectedRoomId: string | null;
  hoveredRoomId: string | null;
  graphOpen: boolean;
  dossier: DossierTarget | null;

  // Floor view filter / layer state
  activeLayers: Set<FloorLayer>;
  groupFilter: string | null;
  areaFilter: string | null;

  enterFloor: (n: number) => void;
  exitFloor: () => void;
  selectRoom: (id: string | null) => void;
  hoverRoom: (id: string | null) => void;
  setGraphOpen: (open: boolean) => void;
  openDossier: (target: DossierTarget) => void;
  closeDossier: () => void;
  toggleLayer: (layer: FloorLayer) => void;
  setGroupFilter: (slug: string | null) => void;
  setAreaFilter: (slug: string | null) => void;
  reset: () => void;
}

export const useUI = create<UIState>((set) => ({
  view: "building",
  activeFloor: null,
  selectedRoomId: null,
  hoveredRoomId: null,
  graphOpen: false,
  dossier: null,
  activeLayers: new Set<FloorLayer>(),
  groupFilter: null,
  areaFilter: null,

  enterFloor: (n) => set({ view: "floor", activeFloor: n, selectedRoomId: null }),
  exitFloor: () => set({ view: "building", activeFloor: null, selectedRoomId: null, dossier: null, groupFilter: null, areaFilter: null }),
  selectRoom: (id) => set((s) => ({
    selectedRoomId: id,
    dossier: id ? { kind: "room", id } : (s.dossier?.kind === "room" ? null : s.dossier),
  })),
  hoverRoom: (id) => set({ hoveredRoomId: id }),
  setGraphOpen: (open) => set({ graphOpen: open }),
  openDossier: (target) => set({ dossier: target }),
  closeDossier: () => set((s) => ({ dossier: null, selectedRoomId: s.dossier?.kind === "room" ? null : s.selectedRoomId })),
  toggleLayer: (layer) => set((s) => {
    const next = new Set(s.activeLayers);
    if (next.has(layer)) next.delete(layer); else next.add(layer);
    return { activeLayers: next };
  }),
  setGroupFilter: (slug) => set((s) => ({ groupFilter: slug, areaFilter: slug ? null : s.areaFilter })),
  setAreaFilter: (slug) => set((s) => ({ areaFilter: slug, groupFilter: slug ? null : s.groupFilter })),
  reset: () => set({ view: "building", activeFloor: null, selectedRoomId: null, hoveredRoomId: null, dossier: null, activeLayers: new Set(), groupFilter: null, areaFilter: null }),
}));
