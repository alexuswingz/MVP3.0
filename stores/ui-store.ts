import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
  
  // Modals
  activeModal: string | null;
  modalData: unknown;
  
  // Theme
  theme: 'dark' | 'light' | 'system';
}

interface UIActions {
  // Sidebar actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Modal actions
  openModal: (name: string, data?: unknown) => void;
  closeModal: () => void;
  
  // Theme actions
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      // Initial state
      sidebarCollapsed: false,
      sidebarOpen: true,
      activeModal: null,
      modalData: null,
      theme: 'dark',

      // Sidebar actions
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Modal actions
      openModal: (name, data) => set({ 
        activeModal: name, 
        modalData: data 
      }),
      closeModal: () => set({ 
        activeModal: null, 
        modalData: null 
      }),

      // Theme actions
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ 
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme 
      }),
    }
  )
);
