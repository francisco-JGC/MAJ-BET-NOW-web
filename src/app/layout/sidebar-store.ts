import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isOpen: boolean;   // mobile drawer
  pinned: boolean;   // desktop: sidebar always visible
  open: () => void;
  close: () => void;
  toggle: () => void;
  togglePinned: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isOpen: false,
      pinned: true,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      togglePinned: () => set((s) => ({ pinned: !s.pinned })),
    }),
    {
      name: 'majbet-sidebar',
      partialize: (s) => ({ pinned: s.pinned }),
    },
  ),
);
