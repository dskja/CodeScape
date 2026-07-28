import { create } from 'zustand';

export interface FocusTarget {
  x: number;
  y: number;
  z: number;
}

export interface CameraCommand {
  type: 'focus' | 'reset';
  target: FocusTarget | null;
  id: number;
}

interface ViewerState {
  selectedId: string | null;
  hoveredId: string | null;
  searchQuery: string;
  cameraCommand: CameraCommand | null;
  setSelectedId: (id: string | null) => void;
  setHoveredId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  triggerFocus: (target: FocusTarget) => void;
  resetView: () => void;
  clearCameraCommand: () => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  selectedId: null,
  hoveredId: null,
  searchQuery: '',
  cameraCommand: null,
  setSelectedId: (id) => set({ selectedId: id }),
  setHoveredId: (id) => set({ hoveredId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  triggerFocus: (target) =>
    set((state) => ({
      cameraCommand: { type: 'focus', target, id: (state.cameraCommand?.id ?? 0) + 1 },
    })),
  resetView: () =>
    set((state) => ({
      selectedId: null,
      hoveredId: null,
      searchQuery: '',
      cameraCommand: { type: 'reset', target: null, id: (state.cameraCommand?.id ?? 0) + 1 },
    })),
  clearCameraCommand: () => set({ cameraCommand: null }),
}));
