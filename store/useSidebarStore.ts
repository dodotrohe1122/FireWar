import { create } from "zustand";

interface SidebarStore {
  menuActive: string | null;
  toggleSetMenuActive: (title: string) => void;
}

export const useSidebarStore = create<SidebarStore>()((set, get) => ({
  menuActive: null,
  toggleSetMenuActive: (title) => {
    set({ menuActive: title });
  },
}));
