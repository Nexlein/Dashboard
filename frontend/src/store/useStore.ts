import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface StoreState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const useStore = create<StoreState>()(
    persist(
        (set) => ({
            theme: 'light',
            setTheme: (theme) => set({ theme }),
        }),
        {
            name: 'dashboard-storage',
            partialize: (state) => ({ theme: state.theme }), // Only persist theme locally
        },
    ),
);
