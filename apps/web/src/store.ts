import { create } from 'zustand';

export interface FocusTarget {
  x: number;
  y: number;
  z: number;
}

interface ViewerState {
  selectedId: string | null;
  hoveredId: string | null;
  focusTarget: FocusTarget | null;
  searchQuery: string;
  setSelectedId: (id: string | null) => void;
  setHoveredId: (id: string | null) => void;
  setFocusTarget: (target: FocusTarget | null) => void;
  setSearchQuery: (query: string) => void;
  resetView: () => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  selectedId: null,
  hoveredId: null,
  focusTarget: null,
  searchQuery: '',
  setSelectedId: (id) => set({ selectedId: id }),
  setHoveredId: (id) => set({ hoveredId: id }),
  setFocusTarget: (target) => set({ focusTarget: target }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetView: () => set({ selectedId: null, focusTarget: null }),
}));
