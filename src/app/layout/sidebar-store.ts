import { create } from 'zustand';

interface SidebarState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * UI state for the sidebar drawer. The sidebar behaves the same at every
 * screen size: hidden off-canvas by default, appears as an overlay with a
 * backdrop when opened via the hamburger.
 *
 * Not persisted — the drawer always starts closed on load so the user lands
 * on content, not on the menu.
 */
export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
